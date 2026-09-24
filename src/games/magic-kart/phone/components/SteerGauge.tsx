"use client";
import { useEffect, useRef } from "react";
import { WheelIcon } from "../../ui/icons";
import { useController } from "./session-context";

/**
 * A steering wheel that turns with the phone, so players can see the
 * tilt is working and how far they are steering. Updated every frame
 * straight on the element.
 */
export function SteerGauge({ className = "" }: { className?: string }) {
  const session = useController();
  const wheelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const steer = session.steer;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${steer * 110}deg)`;
      if (barRef.current) {
        barRef.current.style.left = steer < 0 ? `${50 + steer * 50}%` : "50%";
        barRef.current.style.width = `${Math.abs(steer) * 50}%`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return (
    <div className={`mk-gauge ${className}`}>
      <div ref={wheelRef} className="mk-gauge__wheel">
        <WheelIcon />
      </div>
      <div className="mk-gauge__track">
        <div ref={barRef} className="mk-gauge__bar" />
      </div>
    </div>
  );
}
