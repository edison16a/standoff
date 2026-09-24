"use client";
import "../kit.css";
import { useEffect, useRef, type ReactNode } from "react";

interface FireButtonProps {
  onFire(): void;
  /** When the finger lifts, for guns that keep firing while held. */
  onRelease?(): void;
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
export function FireButton({ onFire, onRelease, label, disabled, children }: FireButtonProps) {
  const held = useRef(false);
  const releaseRef = useRef(onRelease);
  useEffect(() => {
    releaseRef.current = onRelease;
  }, [onRelease]);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    releaseRef.current?.();
  };
  // A disabled button never hears the finger lift, so a trigger held as it
  // turns off would keep firing. Letting go here keeps every game safe.
  useEffect(() => {
    if (disabled) release();
  }, [disabled]);

  return (
    <button
      type="button"
      className="kit-fire"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled) return;
        // Capture keeps the release coming to this button even if the finger slides off it.
        event.currentTarget.setPointerCapture(event.pointerId);
        held.current = true;
        navigator.vibrate?.(12);
        onFire();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      // Keyboard presses arrive as a click with no pointer, so they still fire.
      onClick={(event) => event.detail === 0 && !disabled && onFire()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children ?? label}
    </button>
  );
}
