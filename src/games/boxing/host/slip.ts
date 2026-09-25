import type { MoveState, Side } from "@/games/kit/camera";

export interface SlipOptions {
  /** The head this far sideways from where it has been resting, in shoulder widths, is a slip. */
  shift: number;
  /** The slip ends once the head is back within this share of `shift`. */
  release: number;
  /** How slowly the resting spot follows the head. A slip is over in a moment, so only a step to a new spot is followed all the way. */
  followMs: number;
}

/** About 13 cm, which a real slip covers easily and a sway does not. */
export const DEFAULT_SLIP: SlipOptions = { shift: 0.35, release: 0.55, followMs: 1200 };

/** The kit's torso length in shoulder widths, to report the shift in the same unit as its lean. */
const TORSO = 1.45;
const MAX_STEP_MS = 250;

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
    const { shift, release, followMs } = this.options;
    // A long gap between frames counts as a short one, so the rest spot never leaps after a stall.
    const dt = Math.min(MAX_STEP_MS, Math.max(0, now - this.last));
    this.last = now;
    const side = moves.head.side;
    this.home ??= side;
    const offset = side - this.home;
    // Rest always follows, slowly: a quick slip barely moves it, and a player who steps and stays is soon home again.
    // It moves after the offset is read, so a slip is seen on its first frame even on a slow machine.
    this.home += offset * (1 - Math.exp(-dt / followMs));
    const toward: Side = offset < 0 ? -1 : 1;
    if (Math.abs(offset) >= shift) this.shifted = toward;
    else if (this.shifted !== 0 && (Math.abs(offset) < shift * release || toward !== this.shifted)) this.shifted = 0;
    const slipping: Side = moves.lean !== 0 ? moves.lean : this.shifted;
    const shiftAmount = offset / TORSO;
    this.amount = Math.abs(moves.amounts.lean) >= Math.abs(shiftAmount) ? moves.amounts.lean : shiftAmount;
    return slipping;
  }
}
