"use client";
import { useEffect, useRef } from "react";

/**
 * Hold to stay down behind cover, let go to rise and shoot. It acts on
 * the finger going down and up, not on a click, so a duck is instant.
 */
export function CrouchButton({ disabled, onChange }: { disabled: boolean; onChange(down: boolean): void }) {
  const held = useRef(false);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    change.current(false);
  };
  // A button that turns off under the finger never hears it lift.
  useEffect(() => {
    if (disabled) release();
  }, [disabled]);
  useEffect(() => release, []);

  return (
    <button
      type="button"
      className="cb-crouch"
      disabled={disabled}
      aria-label="Crouch. Hold to stay behind cover"
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled || held.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        held.current = true;
        change.current(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="cb-crouch__word">Crouch</span>
      <small>Hold</small>
    </button>
  );
}
