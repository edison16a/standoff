import type { MoveState, Side } from "@/games/kit/camera";

export interface SlipOptions {
  /** The head this far sideways from where it has been resting, in shoulder widths, is a slip. */
  shift: number;
  /** The slip ends once the head is back within this share of `shift`. */
  release: number;
  /** How slowly the resting spot follows a player who drifts about between punches. */
  followMs: number;
  /** A shift held longer than this is a step to a new spot, not a slip. */
  stepMs: number;
}

/** About 13 cm, which a real slip covers easily and a sway does not. */
export const DEFAULT_SLIP: SlipOptions = { shift: 0.35, release: 0.55, followMs: 1500, stepMs: 1500 };

/** The kit's torso length in shoulder widths, to report the shift in the same unit as its lean. */
const TORSO = 1.45;

/**
 * A slip from the head moving sideways, read from the waist up. The kit's
 * lean catches a tilt at the waist; this also catches the whole upper body
 * shifting over bent knees, which leaves the shoulders level. It measures
 * against where the head has been resting lately, not the calibrated
 * spot, so a boxer drifting about the room never slips by accident.
 */
export class SlipReader {
  /** Signed, in torso lengths like the kit's lean: how far the player is slipping now, for the boxer to show. */
  amount = 0;
  private home: number | null = null;
  private shifted: Side = 0;
  private shiftedAt = 0;
  private last = 0;

  constructor(private readonly options: SlipOptions = DEFAULT_SLIP) {}

  reset(): void {
    this.home = null;
    this.shifted = 0;
    this.amount = 0;
  }

  update(moves: MoveState | null, now: number): Side {
    if (!moves?.present || !moves.calibrated) {
      this.reset();
      return moves?.present ? moves.lean : 0;
    }
    const { shift, release, followMs, stepMs } = this.options;
    const dt = Math.max(0, now - this.last);
    this.last = now;
    const side = moves.head.side;
    this.home ??= side;
    let offset = side - this.home;
    const toward: Side = offset < 0 ? -1 : 1;
    const before = this.shifted;
    if (Math.abs(offset) >= shift) this.shifted = toward;
    else if (this.shifted !== 0 && (Math.abs(offset) < shift * release || toward !== this.shifted)) this.shifted = 0;
    if (this.shifted !== 0 && before === 0) this.shiftedAt = now;
    if (this.shifted !== 0 && now - this.shiftedAt > stepMs) {
      // Still over there after this long: the player moved, so that is the new resting spot.
      this.home = side;
      this.shifted = 0;
      offset = 0;
    }
    const slipping: Side = moves.lean !== 0 ? moves.lean : this.shifted;
    // Rest follows only while nothing is under way, so a slip held for a moment stays a slip.
    if (slipping === 0) this.home += (side - this.home) * (1 - Math.exp(-dt / followMs));
    const shiftAmount = offset / TORSO;
    this.amount = Math.abs(moves.amounts.lean) >= Math.abs(shiftAmount) ? moves.amounts.lean : shiftAmount;
    return slipping;
  }
}
