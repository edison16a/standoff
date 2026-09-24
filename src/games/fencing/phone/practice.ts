import type { Sensitivity } from "@/games/fencing/motion/strike-detector";
import type { StrikeAction } from "@/games/fencing/protocol";

/** Good strikes of each kind the practice asks for. */
export const PRACTICE_REPS = 2;
/**
 * While practising, the detector listens at half the usual level, so even a
 * gentle player's first chop is caught and measured.
 */
export const LISTEN_LEVEL = 0.5;
/** A player's own level sits at this share of their typical strike, so every real one clears it. */
const SHARE = 0.55;
const LEVEL_RANGE = { min: 0.45, max: 1.5 };

export type PracticeStage = "jab" | "parry" | "done";

export interface PracticeResult {
  /** True when the strike was the one asked for. */
  right: boolean;
  stage: PracticeStage;
}

/**
 * The short practice after calibration: jab twice, parry twice. Each strike
 * the detector reads is measured, and from how hard this player actually
 * moves, their own jab and parry levels are set. A strike of the wrong kind
 * does not count, and the screen says what was read instead.
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

  /** The player's own levels, from their strikes so far. Defaults where there were none. */
  get sensitivity(): Sensitivity {
    return { jab: levelFor(this.peaks.jab), parry: levelFor(this.peaks.parry) };
  }
}

/** The level for a set of strike peaks: a share of their median, kept within sane bounds. */
export function levelFor(peaks: readonly number[]): number {
  if (peaks.length === 0) return 1;
  const sorted = [...peaks].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return Math.min(LEVEL_RANGE.max, Math.max(LEVEL_RANGE.min, median * SHARE));
}
