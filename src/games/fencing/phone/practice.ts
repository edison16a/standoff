import type { Sensitivity } from "@/games/fencing/motion/gesture";
import type { StrikeAction } from "@/games/fencing/protocol";

/** Good strikes of each kind the practice asks for. */
export const PRACTICE_REPS = 2;
/**
 * While practising, the detector listens at half the usual level, so even a
 * gentle player's first jab is caught and measured.
 */
export const LISTEN_LEVEL = 0.5;
/** A player's own level sits at this share of their typical jab, so every real one clears it. */
const SHARE = 0.55;
/**
 * Bounds on a player's own level. Below the floor, walking about and
 * bringing the sword back to guard start to read as strikes. Above the
 * ceiling, one wild practice would leave every ordinary jab in the bout
 * unread, since people strike softer once they are playing.
 */
export const LEVEL_RANGE = { min: 0.6, max: 1.25 };
/** The level stays this far under the weakest practice jab, so jabs like it still clear it. */
const WEAKEST_SHARE = 0.85;

export type PracticeStage = "jab" | "parry" | "done";

export interface PracticeResult {
  /** True when the strike was the one asked for. */
  right: boolean;
  stage: PracticeStage;
}

/**
 * The short practice after calibration: jab twice, parry twice. Each jab
 * is measured, and from how hard this player actually moves, their own jab
 * level is set. A parry is a place the blade reaches, so it needs no
 * level. An action of the wrong kind does not count, and the screen says
 * what was read instead.
 */
export class Practice {
  stage: PracticeStage = "jab";
  private readonly peaks: Record<StrikeAction, number[]> = { jab: [], parry: [] };

  count(action: StrikeAction): number {
    return this.peaks[action].length;
  }

  record(action: StrikeAction, peak: number): PracticeResult {
    if (this.stage === "done" || action !== this.stage) return { right: false, stage: this.stage };
    this.peaks[action].push(peak);
    if (this.peaks[action].length >= PRACTICE_REPS) this.stage = action === "jab" ? "parry" : "done";
    return { right: true, stage: this.stage };
  }

  /** The player's own jab level, from their jabs so far. The default when there were none. */
  get sensitivity(): Sensitivity {
    return { strike: levelFor(this.peaks.jab) };
  }
}

/**
 * The level for a set of jab peaks: a share of their median, kept
 * within bounds. The floor never rises above what the player's weakest
 * practice jab reached, or a gentle player who got through the practice
 * would find none of their strikes read in the bout.
 */
export function levelFor(peaks: readonly number[]): number {
  if (peaks.length === 0) return 1;
  const sorted = [...peaks].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const floor = Math.min(LEVEL_RANGE.min, sorted[0]! * WEAKEST_SHARE);
  return Math.min(LEVEL_RANGE.max, Math.max(floor, median * SHARE));
}
