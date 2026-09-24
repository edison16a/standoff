"use client";
import "../styles/preview.css";
import type { CameraKit } from "../host/camera-kit";
import { CameraPreview } from "./CameraPreview";
import { useKitStatus } from "./use-kit";

export interface CornerPreviewProps {
  kit: CameraKit;
  corner?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Width in CSS pixels. The height follows the camera's shape. */
  width?: number;
}

/**
 * A small live picture for the corner of the screen during play, so
 * players can see they are still in view. It says so when someone steps out.
 */
export function CornerPreview({ kit, corner = "bottom-right", width = 260 }: CornerPreviewProps) {
  const status = useKitStatus(kit);
  const missing = status.present.map((seen, i) => (seen ? null : i + 1)).filter((slot): slot is number => slot !== null);
  const ratio = status.camera.height && status.camera.width ? status.camera.height / status.camera.width : 9 / 16;
  return (
    <div className={`cam-corner cam-corner--${corner}`} style={{ width, height: Math.round(width * ratio) }}>
      <CameraPreview kit={kit} fit="cover" />
      {status.ready && missing.length > 0 && (
        <div className="cam-corner__warning" role="status">
          {missing.length === kit.players ? "Step back into view" : `Player ${missing[0]}, step back into view`}
        </div>
      )}
    </div>
  );
}
