import React from "react";
import "./App.css";
import { MediaDeviceProvider } from "./MediaDeviceProvider";
import { VideoConf } from "./VideoConf";

function App() {
  return (
    <MediaDeviceProvider>
      <div className="App">
        <VideoConf />
      </div>
    </MediaDeviceProvider>
  );
}

export default App;
