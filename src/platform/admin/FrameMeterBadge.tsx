"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { FrameMeter, meterVisible, subscribeMeter } from "./frame-meter";

/** How often the number changes, so it stays readable. */
const REFRESH_MS = 250;

/** A small frames per second badge in the bottom left, shown from the admin panel. */
export function FrameMeterBadge() {
  const visible = useSyncExternalStore(subscribeMeter, meterVisible, () => false);
  return visible ? <Badge /> : null;
}

function Badge() {
  const [fps, setFps] = useState(0);
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    const meter = new FrameMeter();
    let frame = 0;
    // The page's own requestAnimationFrame, so the frame limiter counts too.
    const loop = (now: number) => {
      meter.frame(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const timer = window.setInterval(() => setFps(meter.fps), REFRESH_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  // Anything outside the full screen element is hidden, so follow it there.
  useEffect(() => {
    const place = () => setTarget(document.fullscreenElement ?? document.body);
    place();
    document.addEventListener("fullscreenchange", place);
    return () => document.removeEventListener("fullscreenchange", place);
  }, []);

  if (!target) return null;
  return createPortal(
    <div className="frame-meter" aria-live="off">
      {fps > 0 ? fps : "..."} fps
    </div>,
    target,
  );
}
