"use client";
import { useEffect, useState } from "react";
import { useSurvivalStore, type RadioView } from "../host-store";

/** Milliseconds per letter as a call comes in. */
const TYPE_MS = 28;

/**
 * Radio calls, top left: who is talking and what they said, typed out
 * letter by letter as it comes in, then fading after a while. The part
 * not yet typed is laid out but hidden, so the box never grows or
 * rewraps while the words arrive. Keyed by the call, so a new call
 * starts again from the first letter.
 */
export function RadioBox() {
  const radio = useSurvivalStore((s) => s.radio);
  if (!radio) return null;
  return <Call key={radio.id} radio={radio} />;
}

function Call({ radio }: { radio: RadioView }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setShown((n) => {
        if (n >= radio.text.length) clearInterval(timer);
        return Math.min(radio.text.length, n + 1);
      });
    }, TYPE_MS);
    return () => clearInterval(timer);
  }, [radio.text]);

  return (
    <div className="zs-radio" role="status" aria-live="polite">
      <div className="zs-radio__head">
        <span className="zs-radio__led" aria-hidden="true" />
        <span className="zs-radio__from">{radio.from}</span>
        <span className="zs-radio__band">Radio</span>
      </div>
      <p className="zs-radio__text" aria-label={radio.text}>
        <span aria-hidden="true">{radio.text.slice(0, shown)}</span>
        <span className="zs-radio__rest" aria-hidden="true">
          {radio.text.slice(shown)}
        </span>
      </p>
    </div>
  );
}
