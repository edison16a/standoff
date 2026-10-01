"use client";

interface CrouchToggleProps {
  on: boolean;
  disabled: boolean;
  onToggle(): void;
}

/**
 * Crouch as a switch: tap to go low, tap again to stand. It acts on the
 * finger going down, not on a click, so the duck is instant, and it stays
 * lit and says Crouched while it is on, so the player always knows.
 */
export function CrouchToggle({ on, disabled, onToggle }: CrouchToggleProps) {
  return (
    <button
      type="button"
      className={`cb-crouch ${on ? "cb-crouch--on" : ""}`}
      disabled={disabled}
      aria-pressed={on}
      aria-label={on ? "Crouched. Tap to stand up" : "Crouch. Tap to go low"}
      onPointerDown={(event) => {
        event.preventDefault();
        if (!disabled) onToggle();
      }}
      // A keyboard or switch control still works it; a pointer press already has.
      onClick={(event) => {
        if (event.detail === 0 && !disabled) onToggle();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="cb-crouch__word">{on ? "Crouched" : "Crouch"}</span>
      <small>{on ? "Tap to stand" : "Tap"}</small>
    </button>
  );
}
