"use client";
import "../camera.css";
import type { CameraKit } from "../host/camera-kit";
import { useKitStatus } from "./use-kit";

/** A choice of camera, shown only when the computer has more than one. Games can put it in their tool bar. */
export function CameraPicker({ kit, className }: { kit: CameraKit; className?: string }) {
  const { camera } = useKitStatus(kit);
  if (camera.devices.length < 2) return null;
  return (
    <label className={`cam-picker ${className ?? ""}`}>
      <span className="cam-picker__label">Camera</span>
      <select className="cam-picker__select" value={camera.deviceId ?? ""} onChange={(event) => void kit.chooseCamera(event.target.value)}>
        {camera.devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </label>
  );
}
