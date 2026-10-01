import type { Ref } from "react";
import type { AimZone, ScreenPoint } from "../aim-math";
import { TvPicture, tvPoint } from "./TvPicture";

/** The target's ring in the picture. Its circumference sets the dash the hold fills. */
const RING_R = 17;
export const RING = 2 * Math.PI * RING_R;

/** Where the player is with a target: still finding it, holding on it, or taken. */
export type TargetState = "point" | "holding" | "done";

const HINTS: Record<TargetState, string> = { point: "Point and hold still", holding: "Hold it there", done: "Got it" };

interface TargetViewProps {
  /** Where the target is, x and y from -1 to 1 with y up, in the zone. */
  target: ScreenPoint;
  zone: AimZone;
  colour: string;
  state: TargetState;
  /** The progress ring, filled by the caller straight on the SVG as the player holds still. */
  ringRef: Ref<SVGCircleElement>;
  /** Which target this is of how many, such as "2 of 5". */
  count?: string;
  /** Words to show in place of the hint, such as while the sensors wake up. */
  hint?: string;
  /** Shown when the hold is taking long: takes the reading as it is. */
  onAnyway?: () => void;
}

/**
 * One calibration target, as every aiming game shows it: the big screen
 * in miniature with the player's part lit in their colour and the target
 * where the big screen shows it. Holding still fills the ring round it;
 * when it closes the dot pops and the reading is taken. Nothing to tap.
 */
export function TargetView({ target, zone, colour, state, ringRef, count, hint, onAnyway }: TargetViewProps) {
  const at = tvPoint(target, zone);
  return (
    <div className={`kit-target kit-target--${state}`}>
      <TvPicture zone={zone} colour={colour} label="Where to point on the big screen">
        <circle cx={at.x} cy={at.y} r={RING_R} className="kit-target__track" />
        <circle
          ref={ringRef}
          cx={at.x}
          cy={at.y}
          r={RING_R}
          className="kit-target__progress"
          strokeDasharray={RING}
          strokeDashoffset={state === "done" ? 0 : RING}
          transform={`rotate(-90 ${at.x} ${at.y})`}
        />
        <circle cx={at.x} cy={at.y} r="6" className="kit-target__dot" style={{ fill: colour, transformOrigin: `${at.x}px ${at.y}px` }} />
      </TvPicture>
      <p className="kit-target__hint" role="status" aria-live="polite">
        {count && <span className="kit-target__count">{count}</span>}
        <span>{hint ?? HINTS[state]}</span>
      </p>
      {onAnyway && state !== "done" && (
        <button type="button" className="btn btn--ghost btn--block" onClick={onAnyway}>
          Use where I point now
        </button>
      )}
    </div>
  );
}
