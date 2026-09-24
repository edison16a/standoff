"use client";
import { useEffect, useState, type PointerEvent, type ReactNode } from "react";

interface HoldButtonProps {
  className: string;
  label: string;
  onHold(held: boolean): void;
  children: ReactNode;
}

/**
 * A pedal: held while a finger is on it. It captures the pointer so a
 * thumb sliding off still lets go properly, and it lets go on cancel,
 * on lost capture and when the page is hidden, so it can never stick
 * down and drive a kart on its own.
 */
export function HoldButton({ className, label, onHold, children }: HoldButtonProps) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    onHold(held);
  }, [held, onHold]);

  useEffect(() => {
    const release = () => setHeld(false);
    const hidden = () => document.hidden && release();
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
      onHold(false);
    };
  }, [onHold]);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={held}
      className={`${className} ${held ? "is-held" : ""}`}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
      }}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onLostPointerCapture={() => setHeld(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}
