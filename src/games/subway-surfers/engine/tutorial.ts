/**
 * The short live tutorial before the first run: each player moves left,
 * moves right, jumps and rolls, in that order, and each move is ticked
 * off as the camera sees it. Every move is the head leaving its band, so
 * the camera only needs to see players from the waist up. Pure, so tests
 * can drive it with moves.
 */

export type TutorialStep = "left" | "right" | "jump" | "duck";

export const TUTORIAL_STEPS: readonly TutorialStep[] = ["left", "right", "jump", "duck"];

export const STEP_TEXT: Record<TutorialStep, { title: string; hint: string }> = {
  left: { title: "Move left", hint: "Move or lean your head and shoulders to your left" },
  right: { title: "Move right", hint: "Now move or lean to your right, past the middle" },
  jump: { title: "Jump", hint: "Jump so your head goes up past the top of your band" },
  duck: { title: "Roll", hint: "Duck so your head drops below your band" },
};

/** A move as the tutorial needs it: a lane reached, a jump or a duck. */
export type TutorialMove = { type: "lane"; lane: number } | { type: "jump" } | { type: "duck" };

export class Tutorial {
  /** How many steps are done. */
  done = 0;

  get step(): TutorialStep | null {
    return TUTORIAL_STEPS[this.done] ?? null;
  }

  get finished(): boolean {
    return this.done >= TUTORIAL_STEPS.length;
  }

  /** Feeds one move. Returns true when it ticks off the current step. */
  see(move: TutorialMove): boolean {
    const step = this.step;
    const ok =
      (step === "left" && move.type === "lane" && move.lane < 0) ||
      (step === "right" && move.type === "lane" && move.lane > 0) ||
      (step === "jump" && move.type === "jump") ||
      (step === "duck" && move.type === "duck");
    if (ok) this.done++;
    return ok;
  }
}
