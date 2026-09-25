/**
 * The short live tutorial before the first run: each player steps left,
 * steps right, jumps and ducks, in that order, and each move is ticked
 * off as the camera sees it. Pure, so tests can drive it with moves.
 */

export type TutorialStep = "left" | "right" | "jump" | "duck";

export const TUTORIAL_STEPS: readonly TutorialStep[] = ["left", "right", "jump", "duck"];

export const STEP_TEXT: Record<TutorialStep, { title: string; hint: string }> = {
  left: { title: "Step left", hint: "One big step to your left, or lean that way" },
  right: { title: "Step right", hint: "Now step or lean to your right, past the middle" },
  jump: { title: "Jump", hint: "Jump up with both feet" },
  duck: { title: "Duck", hint: "Bend your knees and get low" },
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
