import React, { useEffect, useRef } from "react";
import { useMediaDevicesContext } from "./MediaDeviceProvider";
import { useWebRtcContext } from "./WebRTCProvider";

export function VideoConf() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomIdRef = useRef<HTMLInputElement>(null);
  const devices = useMediaDevicesContext();
  const webRtc = useWebRtcContext();

  useEffect(() => {
    function onInit() {}
    function onUserMedia({ localStream, remoteStream }: any) {
      if (localVideoRef.current && remoteVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }

    webRtc.on("init", onInit);
    webRtc.on("userMedia", onUserMedia);

    return () => {
      webRtc.off("init", onInit);
      webRtc.off("userMedia", onUserMedia);
    };
  }, []);

  return (
    <div>
      <ul>
        {Array.from(Object.entries(devices)).map(([key, devices]) => {
          return (
            <li key={key}>
              {key}{" "}
              <select>
                {devices.map((d) => (
                  <option key={d.deviceId}>{d.label}</option>
                ))}
                )
              </select>
            </li>
          );
        })}
      </ul>

      <h1>Welcome to FirebaseRTC!</h1>
      <div>
        <button
          className="mdc-button mdc-button--raised"
          onClick={() => webRtc.openUserMedia()}
        >
          Open camera & microphone
        </button>
        <button
          className="mdc-button mdc-button--raised"
          onClick={() => webRtc.createRoom()}
        >
          Create room
        </button>
        <button className="mdc-button mdc-button--raised" id="joinBtn">
          Join room
        </button>
        <button
          className="mdc-button mdc-button--raised"
          onClick={() => webRtc.hangUp()}
        >
          Hangup
        </button>
      </div>
      <div>
        <span id="currentRoom"></span>
      </div>
      <div id="videos">
        <video ref={localVideoRef} muted autoPlay playsInline></video>
        <video ref={remoteVideoRef} autoPlay playsInline></video>
      </div>
      <div
        className="mdc-dialog"
        id="room-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="my-dialog-title"
        aria-describedby="my-dialog-content"
      >
        <div className="mdc-dialog__container">
          <div className="mdc-dialog__surface">
            <h2 className="mdc-dialog__title" id="my-dialog-title">
              Join room
            </h2>
            <div className="mdc-dialog__content" id="my-dialog-content">
              Enter ID for room to join:
              <div className="mdc-text-field">
                <input
                  type="text"
                  ref={roomIdRef}
                  className="mdc-text-field__input"
                />
                <label className="mdc-floating-label" htmlFor="my-text-field">
                  Room ID
                </label>
                <div className="mdc-line-ripple"></div>
              </div>
            </div>
            <footer className="mdc-dialog__actions">
              <button
                type="button"
                className="mdc-button mdc-dialog__button"
                data-mdc-dialog-action="no"
              >
                <span className="mdc-button__label">Cancel</span>
              </button>
              <button
                id="confirmJoinBtn"
                type="button"
                className="mdc-button mdc-dialog__button"
                data-mdc-dialog-action="yes"
                onClick={() => {
                  if (roomIdRef.current) {
                    webRtc.joinRoomById(roomIdRef.current.value);
                  }
                }}
              >
                <span className="mdc-button__label">Join</span>
              </button>
            </footer>
          </div>
        </div>
        <div className="mdc-dialog__scrim"></div>
      </div>
    </div>
  );
}
