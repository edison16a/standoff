"use client";
import "./pad.css";
import { useEffect, useRef, type ReactNode } from "react";

interface PadButtonProps {
  label: string;
  onDown(): void;
  onUp?(): void;
  /** The button's colour. */
  colour?: string;
  /** Bigger for the main action. */
  size?: "lg" | "md";
  disabled?: boolean;
  /** An icon or a short word. Defaults to the label. */
  children?: ReactNode;
}

/**
 * A round game button. It acts on touch down, keeps hearing the finger
 * even if it slides off, and lets go by itself if it turns disabled while
 * held, so no action ever sticks on.
 */
export function PadButton({ label, onDown, onUp, colour, size = "md", disabled, children }: PadButtonProps) {
  const held = useRef(false);
  const upRef = useRef(onUp);
  useEffect(() => {
    upRef.current = onUp;
  }, [onUp]);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    upRef.current?.();
  };
  useEffect(() => {
    if (disabled) release();
  }, [disabled]);

  return (
    <button
      type="button"
      className={`kit-pad-btn kit-pad-btn--${size}`}
      style={colour ? ({ "--pad-colour": colour } as React.CSSProperties) : undefined}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled || held.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        held.current = true;
        onDown();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onClick={(event) => {
        // Keyboard presses arrive as a click with no pointer.
        if (event.detail !== 0 || disabled) return;
        onDown();
        upRef.current?.();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children ?? label}
    </button>
  );
}
