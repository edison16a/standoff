"use client";
import { useEffect, useRef, useState } from "react";
import { meterLevel, type MeterWindow, type PassGrade } from "../../engine/pass-meter";
import { usePhoneStore } from "../phone-store";

/** How long the stopped marker and its word stay after a throw. */
const RESULT_MS = 1100;

export const GRADE_WORDS: Record<PassGrade, string> = { perfect: "Perfect", good: "Good", weak: "Weak", hot: "Too hot" };

/** The last throw's reading for a moment after it, then null. */
export function useFreshThrow(): ThrowResult | null {
  const last = usePhoneStore((s) => s.lastThrow);
  // The result's time once it has shown long enough, so the word goes away.
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (!last) return;
    const timer = setTimeout(() => setExpired(last.at), RESULT_MS);
    return () => clearTimeout(timer);
  }, [last]);
  return last && expired !== last.at ? last : null;
}

type ThrowResult = NonNullable<ReturnType<typeof usePhoneStore.getState>["lastThrow"]>;

const pct = (v: number) => `${Math.max(0, Math.min(100, v * 100))}%`;

/**
 * The throw meter beside the throw stick: a slim bar with the green band
 * and the thin gold heart of it. The marker climbs and falls while the
 * thumb is down, on this phone's own clock from the touch, exactly as
 * the host will grade the throw. After the throw it stays where it was
 * let go with a word for how it went.
 */
export function ThrowMeter({ window }: { window: MeterWindow }) {
  const since = usePhoneStore((s) => s.throwSince);
  const last = useFreshThrow();
  const marker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (since === null) return;
    let frame = 0;
    const draw = () => {
      if (marker.current) marker.current.style.bottom = pct(meterLevel(performance.now() - since));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [since]);

  const fresh = since === null && last !== null;
  const grade = fresh ? last.reading.grade : null;
  const stopped = fresh ? pct(last.reading.level) : "0%";
  return (
    <div className={`fb-tmeter ${since !== null ? "fb-tmeter--on" : ""} ${grade ? `fb-tmeter--${grade}` : ""}`} aria-hidden="true">
      <div className="fb-tmeter__bar">
        <div className="fb-tmeter__green" style={{ bottom: pct(window.center - window.green), height: pct(window.green * 2) }} />
        <div className="fb-tmeter__gold" style={{ bottom: pct(window.center - window.gold), height: pct(window.gold * 2) }} />
        <div ref={marker} className="fb-tmeter__marker" style={since === null ? { bottom: stopped } : undefined} />
      </div>
      <span className="fb-tmeter__word">{grade ? GRADE_WORDS[grade] : "Pass"}</span>
    </div>
  );
}
