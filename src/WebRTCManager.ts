import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { EventEmitter } from "events";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager extends EventEmitter {
  private peerConnection?: RTCPeerConnection = undefined;
  private localStream?: MediaStream = undefined;
  private remoteStream?: MediaStream = undefined;
  private roomId?: string = undefined;

  public init() {
    this.emit("init");
  }

  public async createRoom() {
    const roomRef = await doc(collection(db, "rooms"));

    console.log("Create PeerConnection with configuration: ", configuration);
    this.peerConnection = new RTCPeerConnection(configuration);

    this.registerPeerConnectionListeners();

    this.localStream?.getTracks().forEach((track: MediaStreamTrack) => {
      if (this.localStream) {
        this.peerConnection?.addTrack(track, this.localStream);
      }
    });

    // Code for collecting ICE candidates below
    const callerCandidatesCollection = collection(roomRef, "callerCandidates");

    this.peerConnection.addEventListener("icecandidate", (event) => {
      if (!event.candidate) {
        console.log("Got final candidate!");
        return;
      }
      console.log("Got candidate: ", event.candidate);
      addDoc(callerCandidatesCollection, event.candidate.toJSON());
    });
    // Code for collecting ICE candidates above

    // Code for creating a room below
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    console.log("Created offer:", offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    };
    await setDoc(roomRef, roomWithOffer);
    this.roomId = roomRef.id;
    console.log(`New room created with SDP offer. Room ID: ${roomRef.id}`);

    this.peerConnection.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        this.remoteStream?.addTrack(track);
      });
    });

    // Listening for remote session description below
    onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      if (
        !this.peerConnection?.currentRemoteDescription &&
        data &&
        data.answer
      ) {
        console.log("Got remote description: ", data.answer);
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await this.peerConnection?.setRemoteDescription(rtcSessionDescription);
      }
    });
    // Listening for remote session description above

    // Listen for remote ICE candidates below
    onSnapshot(collection(roomRef, "calleeCandidates"), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
          await this.peerConnection?.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
    // Listen for remote ICE candidates above

    this.emit("roomCreated", { roomId: this.roomId });
  }

  async joinRoomById(roomId: string) {
    this.roomId = roomId;
    const roomRef = doc(db, "rooms", `${roomId}`);
    const roomSnapshot = await getDoc(roomRef);
    console.log("Got room:", roomSnapshot.exists);

    if (roomSnapshot.exists()) {
      console.log("Create PeerConnection with configuration: ", configuration);
      this.peerConnection = new RTCPeerConnection(configuration);
      this.registerPeerConnectionListeners();
      this.localStream?.getTracks().forEach((track) => {
        if (this.localStream) {
          this.peerConnection?.addTrack(track, this.localStream);
        }
      });

      // Code for collecting ICE candidates below
      const calleeCandidatesCollection = collection(
        roomRef,
        "calleeCandidates"
      );
      this.peerConnection.addEventListener("icecandidate", (event) => {
        if (!event.candidate) {
          console.log("Got final candidate!");
          return;
        }
        console.log("Got candidate: ", event.candidate);
        addDoc(calleeCandidatesCollection, event.candidate.toJSON());
      });
      // Code for collecting ICE candidates above

      this.peerConnection?.addEventListener("track", (event) => {
        console.log("Got remote track:", event.streams[0]);
        event.streams[0].getTracks().forEach((track) => {
          console.log("Add a track to the remoteStream:", track);
          this.remoteStream?.addTrack(track);
        });
      });

      // Code for creating SDP answer below
      const offer = roomSnapshot.data().offer;
      console.log("Got offer:", offer);
      await this.peerConnection?.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await this.peerConnection?.createAnswer();
      console.log("Created answer:", answer);
      await this.peerConnection?.setLocalDescription(answer);

      const roomWithAnswer = {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      };
      await updateDoc(roomRef, roomWithAnswer);
      // Code for creating SDP answer above

      // Listening for remote ICE candidates below
      onSnapshot(collection(roomRef, "callerCandidates"), (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            let data = change.doc.data();
            console.log(
              `Got new remote ICE candidate: ${JSON.stringify(data)}`
            );
            await this.peerConnection?.addIceCandidate(
              new RTCIceCandidate(data)
            );
          }
        });
      });
      // Listening for remote ICE candidates above
    }
  }

  async openUserMedia() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const device = devices.find(
      (d) => d.kind === "videoinput" && !/\sIR\s/.test(d.label)
    );
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: device?.deviceId,
      },
      audio: true,
    });
    this.remoteStream = new MediaStream();

    console.log("Stream:", this.localStream);

    this.emit("userMedia", {
      localStream: this.localStream,
      remoteStream: this.remoteStream,
    });
  }

  async hangUp() {
    this.emit("hangup");
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Delete room on hangup
    if (this.roomId) {
      const roomRef = doc(db, "rooms", this.roomId);
      const calleeCandidates = await getDocs(
        collection(roomRef, "calleeCandidates")
      );
      calleeCandidates.forEach(async (candidate) => {
        await deleteDoc(candidate.ref);
      });

      const callerCandidates = await getDocs(
        collection(roomRef, "callerCandidates")
      );

      callerCandidates.forEach(async (candidate) => {
        await deleteDoc(candidate.ref);
      });
      await deleteDoc(roomRef);
    }
    this.init();
  }

  private registerPeerConnectionListeners() {
    const connection = this.peerConnection;
    if (!connection) {
      throw new Error("Peer connection is undefined!");
    }

    connection.addEventListener("icegatheringstatechange", () => {
      console.log(
        `ICE gathering state changed: ${connection.iceGatheringState}`
      );
    });

    connection.addEventListener("connectionstatechange", () => {
      console.log(`Connection state change: ${connection.connectionState}`);
    });

    connection.addEventListener("signalingstatechange", () => {
      console.log(`Signaling state change: ${connection.signalingState}`);
    });

    connection.addEventListener("iceconnectionstatechange ", () => {
      console.log(
        `ICE connection state change: ${connection.iceConnectionState}`
      );
    });
  }
}
