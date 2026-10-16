"use client";
import { RUNNER_COLOUR_NAMES, RUNNER_COLOURS } from "../../engine/playbook/colours";
import type { PhoneState } from "../../protocol";
import { usePhone } from "./session-context";
import { useThrowGesture } from "./use-throw-gesture";

/** The four buttons are always there, in their places, so a thumb learns where each colour is. */
const SLOTS = [0, 1, 2, 3] as const;

/**
 * The pitch on a run call: a wide bar under the throw buttons, ringed in
 * the back's colour, pressed like any pad button.
 */
function PitchBar({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const colour = host.backSlot !== null ? RUNNER_COLOURS[host.backSlot] : "#ffffff";
  const off = !host.canPitch;
  return (
    <button
      type="button"
      className="fb-pitch"
      style={{ "--runner": colour } as React.CSSProperties}
      disabled={off}
      aria-label={host.backSlot !== null ? `Pitch to ${host.backSlot + 1}` : "Pitch"}
      onPointerDown={(event) => {
        event.preventDefault();
        if (off) return;
        phone.press("pass", true);
        phone.press("pass", false);
      }}
      onClick={(event) => {
        if (event.detail !== 0 || off) return;
        phone.press("pass", true);
        phone.press("pass", false);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      Pitch{host.backSlot !== null && <span className="fb-pitch__n">{host.backSlot + 1}</span>}
    </button>
  );
}

/**
 * The QB's throw buttons under the right thumb: one per runner of the
 * play, filled in his colour with his number and the colour's name, as
 * the card and the big screen mark him. A finger down on one lights that
 * runner up here and on the big screen; sliding onto another moves the
 * light; letting go on a button throws to him (the host leads a moving
 * runner and throws at a standing one), and letting go off them all
 * throws nothing. A quick tap still throws at once. A button greys out
 * while that throw cannot go, before the snap or with the runner on the
 * turf.
 */
export function ThrowButtons({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const { gesture, lit, buttons, handlers } = useThrowGesture(host);
  const holding = gesture.pointer !== null;
  const off = holding && gesture.slot === null;
  const classes = ["fb-throws", host.runPlay && "fb-throws--run", holding && "fb-throws--holding", off && "fb-throws--off"];
  return (
    <div className={classes.filter(Boolean).join(" ")} role="group" aria-label="Throw to a runner" {...handlers}>
      {SLOTS.map((slot) => {
        const open = host.throws[slot] ?? false;
        const name = RUNNER_COLOUR_NAMES[slot];
        const hot = lit === slot;
        return (
          <button
            key={slot}
            ref={(el) => {
              buttons.current[slot] = el;
            }}
            type="button"
            className={`fb-throws__btn ${host.backSlot === slot ? "fb-throws__btn--back" : ""} ${hot ? "fb-throws__btn--hot" : ""}`}
            style={{ "--runner": RUNNER_COLOURS[slot] } as React.CSSProperties}
            aria-label={`Throw to ${slot + 1}, ${name}`}
            aria-pressed={hot}
            disabled={!open}
            onClick={(event) => {
              // Keyboard presses arrive as a click with no pointer.
              if (event.detail === 0 && open) phone.throwTo(slot);
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span className="fb-throws__n">{slot + 1}</span>
            <span className="fb-throws__name">{name}</span>
          </button>
        );
      })}
      {/* While a finger holds, a word on what letting go does: off the buttons nothing is thrown. */}
      {holding && (
        <span className="fb-throws__hint" aria-live="polite">
          {off ? "Let go to cancel" : "Slide off to cancel"}
        </span>
      )}
      {/* A run call is only the play's shape: the throws stay, and Pitch joins them. */}
      {host.runPlay && <PitchBar host={host} />}
    </div>
  );
}
