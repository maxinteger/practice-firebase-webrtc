import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type MediaContextValue = Record<MediaDeviceKind, MediaDeviceInfo[]>;

type Props = { children: ReactNode };

const mediaDeviceContext = createContext<MediaContextValue>(
  {} as MediaContextValue
);

export function MediaDeviceProvider({ children }: Props) {
  const [devices, setDevices] = useState<MediaContextValue>(
    {} as MediaContextValue
  );
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setDevices(
        devices.reduce((map, device) => {
          if (!map[device.kind]) {
            map[device.kind] = [];
          }
          map[device.kind].push(device);
          return map;
        }, {} as MediaContextValue)
      );
    });
  }, []);

  console.log(devices);

  return (
    <mediaDeviceContext.Provider value={devices}>
      {children}
    </mediaDeviceContext.Provider>
  );
}

export function useMediaDevicesContext() {
  return useContext(mediaDeviceContext);
}
