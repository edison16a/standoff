"use client";
import { useRef } from "react";
import { useAnimationFrame } from "@/hooks/use-animation-frame";
import { useController } from "./session-context";

/**
 * The blade as the host will draw it, seen from the side. It moves every
 * frame, so it is updated directly rather than through React state.
 */
export function SwordGauge() {
  const session = useController();
  const bladeRef = useRef<SVGGElement>(null);
  useAnimationFrame(() => {
    const { pitch, yaw } = session.frame;
    const degrees = (-(0.16 + pitch) * 180) / Math.PI;
    const reach = Math.max(0.35, Math.cos(yaw));
    bladeRef.current?.setAttribute("transform", `rotate(${degrees.toFixed(1)} 30 60) translate(30 60) scale(${reach.toFixed(3)} 1) translate(-30 -60)`);
  });
  return (
    <svg className="gauge" viewBox="0 0 160 120" aria-label="Sword angle">
      <line x1="30" y1="60" x2="150" y2="60" className="gauge__guide" />
      <g ref={bladeRef}>
        <line x1="30" y1="60" x2="148" y2="60" className="gauge__blade" />
      </g>
      <circle cx="30" cy="60" r="7" className="gauge__hilt" />
    </svg>
  );
}

/** Footwork from -1 (retreat) to 1 (advance), with the centre marked. */
export function MoveMeter() {
  const session = useController();
  const fillRef = useRef<HTMLSpanElement>(null);
  useAnimationFrame(() => {
    const move = session.frame.move;
    const el = fillRef.current;
    if (!el) return;
    el.style.left = `${50 + Math.min(0, move) * 50}%`;
    el.style.width = `${Math.abs(move) * 50}%`;
  });
  return (
    <div className="meter" aria-label="Footwork">
      <span className="meter__label muted">Retreat</span>
      <div className="meter__track">
        <span ref={fillRef} className="meter__fill" />
        <span className="meter__centre" />
      </div>
      <span className="meter__label muted">Advance</span>
    </div>
  );
}
