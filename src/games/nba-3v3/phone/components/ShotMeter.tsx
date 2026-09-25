"use client";
import { useEffect, useRef } from "react";
import type { CourtState } from "../../protocol";
import { useControllerStore } from "../controller-store";

/**
 * The shot meter beside the Shoot button: it fills while Shoot is held
 * and the green band is where to let go. It runs on the phone's own
 * clock from the moment the thumb went down, so what the player sees is
 * exactly what the host judges. At the free throw line it lights up and
 * waits for the shot, its green band a little wider.
 */
export function ShotMeter({ meter, free = false }: { meter: CourtState["meter"]; free?: boolean }) {
  const since = useControllerStore((s) => s.aimingSince);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (since === null) return;
    let frame = 0;
    const draw = () => {
      const held = performance.now() - since;
      if (fillRef.current) fillRef.current.style.height = `${Math.min(100, (held / meter.fullMs) * 100)}%`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [since, meter.fullMs]);

  const bottom = ((meter.greenMs - meter.halfMs) / meter.fullMs) * 100;
  const height = ((meter.halfMs * 2) / meter.fullMs) * 100;
  return (
    <div className={`nba-meter ${since !== null ? "nba-meter--on" : ""} ${free ? "nba-meter--free" : ""}`} aria-hidden="true">
      <div className="nba-meter__green" style={{ bottom: `${bottom}%`, height: `${height}%` }} />
      <div ref={fillRef} className="nba-meter__fill" />
    </div>
  );
}
