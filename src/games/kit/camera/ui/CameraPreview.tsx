"use client";
import "../styles/preview.css";
import { useEffect, useRef, type ReactNode } from "react";
import { playerColor } from "@/games/kit/players";
import type { CameraKit } from "../host/camera-kit";
import { drawGuide, drawSkeleton, type GuideState } from "./draw";
import { fitVideo, type Fit } from "./fit";
import { useKitStatus } from "./use-kit";

export interface CameraPreviewProps {
  kit: CameraKit;
  /** "cover" fills the box, cropping the edges. "contain" shows the whole picture. */
  fit?: "cover" | "contain";
  skeletons?: boolean;
  /** Draws an outline where each player should stand, in their colour. */
  spots?: boolean;
  /** Outlines with rings that fill, as calibration uses. Read every frame, so it can change without a render. */
  guides?: () => readonly GuideState[];
  className?: string;
  /** Overlays laid over the picture, like labels. */
  children?: ReactNode;
  /** Called when the picture's place in the box changes, for overlays that line up with it. */
  onFit?: (fit: Fit) => void;
}

/**
 * The camera picture, mirrored like a selfie, with every player's skeleton
 * in their colour. Drawing runs in its own animation loop from the kit's
 * latest frame, so React never re-renders for a moving player.
 */
export function CameraPreview({ kit, fit: mode = "cover", skeletons = true, spots = false, guides, className, children, onFit }: CameraPreviewProps) {
  const status = useKitStatus(kit);
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guidesRef = useRef(guides);
  const onFitRef = useRef(onFit);
  useEffect(() => {
    guidesRef.current = guides;
    onFitRef.current = onFit;
  }, [guides, onFit]);

  const stream = status.camera.stream;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => undefined);
  }, [stream]);

  const { width: videoWidth, height: videoHeight } = status.camera;
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;
    let frame = 0;
    let lastFit = "";
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = box.clientWidth;
      const height = box.clientHeight;
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const fit = fitVideo(videoWidth, videoHeight, width, height, mode);
      const key = `${fit.x}|${fit.y}|${fit.width}|${fit.height}`;
      if (key !== lastFit) {
        lastFit = key;
        onFitRef.current?.(fit);
      }
      const outlines = guidesRef.current?.() ?? (spots ? plainGuides(kit) : []);
      for (const guide of outlines) {
        const spot = kit.spots[guide.slot - 1];
        if (spot) drawGuide(ctx, spot, guide, fit);
      }
      if (skeletons) {
        kit.latest().bodies.forEach((body, i) => body && drawSkeleton(ctx, body, playerColor(i + 1), fit));
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kit, mode, skeletons, spots, videoWidth, videoHeight]);

  return (
    <div ref={boxRef} className={`cam-preview ${className ?? ""}`}>
      {status.fake ? (
        <div className="cam-preview__fake" aria-hidden="true">
          <span>Test camera</span>
        </div>
      ) : (
        <video ref={videoRef} className={`cam-preview__video cam-preview__video--${mode}`} muted playsInline autoPlay aria-hidden="true" />
      )}
      <canvas ref={canvasRef} className="cam-preview__canvas" aria-hidden="true" />
      {children}
    </div>
  );
}

/** Every spot as an empty outline, with no ring filling. */
function plainGuides(kit: CameraKit): GuideState[] {
  return kit.spots.map((spot) => ({ slot: spot.slot, colour: playerColor(spot.slot), phase: "find", progress: 0 }));
}
