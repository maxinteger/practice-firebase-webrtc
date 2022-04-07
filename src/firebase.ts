import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDk097morIauzyEriYxORhd1J5C9W4-gg",
  authDomain: "tavmokus-webrtc.firebaseapp.com",
  projectId: "tavmokus-webrtc",
  storageBucket: "tavmokus-webrtc.appspot.com",
  messagingSenderId: "611168461700",
  appId: "1:611168461700:web:06b115a33b7607f0adb3d1",
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
