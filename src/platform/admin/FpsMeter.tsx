"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FrameCounter, fpsMeterShown, subscribeFpsMeter } from "./fps-meter";
import "./admin.css";

/**
 * The frame rate in the bottom left corner while the admin panel's switch
 * is on. It counts through requestAnimationFrame, so it reads the rate
 * after the frame limiter, the one games actually get.
 */
export function FpsMeter() {
  const shown = useSyncExternalStore(subscribeFpsMeter, fpsMeterShown, () => false);
  return shown ? <Readout /> : null;
}

function Readout() {
  const [fps, setFps] = useState<number | null>(null);
  // In full screen only the full screen element is drawn, so the readout follows it there.
  const [host, setHost] = useState<Element>(() => document.fullscreenElement ?? document.body);

  useEffect(() => {
    const counter = new FrameCounter();
    let raf = requestAnimationFrame(function tick(now) {
      const next = counter.frame(now);
      if (next !== null) setFps(Math.round(next));
      raf = requestAnimationFrame(tick);
    });
    const follow = () => setHost(document.fullscreenElement ?? document.body);
    document.addEventListener("fullscreenchange", follow);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("fullscreenchange", follow);
    };
  }, []);

  return createPortal(
    <output className="fps-meter" aria-live="off">
      {fps === null ? (
        "Measuring"
      ) : (
        <>
          {fps} <small>fps</small>
        </>
      )}
    </output>,
    host,
  );
}
