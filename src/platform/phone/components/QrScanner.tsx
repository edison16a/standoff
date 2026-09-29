"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Loader";
import { roomCodeFrom } from "../join-code";
import { makeQrReader } from "../qr-detect";

/** Reads a few frames a second. Plenty for a QR code held still, and easy on the battery. */
const SCAN_EVERY_MS = 180;

type CameraState = "starting" | "live" | "blocked";

/**
 * The full screen camera view for scanning the host's QR code. It keeps
 * reading until it sees a room code, then hands it over and stops the
 * camera. Anything else it sees is ignored.
 */
export function QrScanner({ onCode, onClose }: { onCode(code: string): void; onClose(): void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  // The latest callback, so the camera effect runs once and never restarts the camera.
  const found = useRef(onCode);
  useEffect(() => {
    found.current = onCode;
  });

  useEffect(() => {
    const read = makeQrReader();
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    const scan = async () => {
      const video = videoRef.current;
      if (!alive || !read || !video) return;
      if (video.readyState >= 2) {
        const texts = await read(video).catch(() => []);
        const code = texts.map(roomCodeFrom).find((value) => value !== null);
        if (code && alive) return found.current(code);
      }
      if (alive) timer = setTimeout(() => void scan(), SCAN_EVERY_MS);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (media) => {
        stream = media;
        const video = videoRef.current;
        if (!alive || !video) return;
        video.srcObject = media;
        await video.play().catch(() => undefined);
        setState("live");
        void scan();
      })
      .catch(() => alive && setState("blocked"));

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="qr-scan" role="dialog" aria-label="Scan the QR code">
      <video ref={videoRef} className="qr-scan__video" playsInline muted />
      <div className="qr-scan__frame" aria-hidden="true" />
      <p className="qr-scan__hint">
        {state === "starting" && (
          <>
            <Spinner /> Starting the camera
          </>
        )}
        {state === "live" && "Point at the QR code on the big screen"}
        {state === "blocked" && "The camera is not available. Type the code instead."}
      </p>
      <button type="button" className="btn btn--lg qr-scan__close" onClick={onClose}>
        <Icon name="close" />
        Close
      </button>
    </div>
  );
}
