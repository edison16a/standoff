"use client";
import { useEffect, useRef, type ReactNode } from "react";

interface HoldButtonProps {
  className: string;
  label: string;
  disabled: boolean;
  onChange(down: boolean): void;
  children: ReactNode;
}

/**
 * A button that acts while it is held: Crouch, Advance and Retreat. It
 * works on the finger going down and up, not on a click, so it answers at
 * once, and each keeps its own finger so two can be held together.
 */
export function HoldButton({ className, label, disabled, onChange, children }: HoldButtonProps) {
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
      className={`cb-hold ${className}`}
      disabled={disabled}
      aria-label={label}
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
      {children}
    </button>
  );
}
