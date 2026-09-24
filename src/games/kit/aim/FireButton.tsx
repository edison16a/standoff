"use client";
import "../kit.css";
import type { ReactNode } from "react";

interface FireButtonProps {
  onFire(): void;
  label: string;
  disabled?: boolean;
  /** An icon or short word inside the button. Defaults to the label. */
  children?: ReactNode;
}

/**
 * The big round trigger in the middle of the phone. It fires on touch
 * down, not on release, because a shot that waits for the finger to lift
 * lands late.
 */
export function FireButton({ onFire, label, disabled, children }: FireButtonProps) {
  return (
    <button
      type="button"
      className="kit-fire"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled) return;
        navigator.vibrate?.(12);
        onFire();
      }}
      // Keyboard presses arrive as a click with no pointer, so they still fire.
      onClick={(event) => event.detail === 0 && !disabled && onFire()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children ?? label}
    </button>
  );
}
