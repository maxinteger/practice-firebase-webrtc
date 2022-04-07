import { createContext, ReactNode, useContext } from "react";
import { WebRTCManager } from "./WebRTCManager";

type Props = {
  children: ReactNode;
};

const instance = new WebRTCManager();
const webRtcContext = createContext(instance);

export function WebRtcProvider({ children }: Props) {
  return (
    <webRtcContext.Provider value={instance}>{children}</webRtcContext.Provider>
  );
}

export function useWebRtcContext() {
  return useContext(webRtcContext);
}
