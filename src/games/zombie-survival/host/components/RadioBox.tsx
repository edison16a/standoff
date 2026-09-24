"use client";
import { useSurvivalStore } from "../host-store";

/**
 * Radio calls, bottom left above the guns: who is talking and what they
 * said, typed out as it comes in, then fading after a while. Keyed by
 * the call, so a new call restarts the animation.
 */
export function RadioBox() {
  const radio = useSurvivalStore((s) => s.radio);
  if (!radio) return null;
  return (
    <div key={radio.id} className="zs-radio" role="status" aria-live="polite">
      <div className="zs-radio__head">
        <span className="zs-radio__led" aria-hidden="true" />
        <span className="zs-radio__from">{radio.from}</span>
        <span className="zs-radio__band">Radio</span>
      </div>
      <p className="zs-radio__text" style={{ ["--chars" as string]: radio.text.length }}>
        {radio.text}
      </p>
    </div>
  );
}
