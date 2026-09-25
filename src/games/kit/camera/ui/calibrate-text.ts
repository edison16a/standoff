import type { CalibrationPhase } from "../engine/calibration";
import type { SpotIssue } from "../engine/spots";

/** One plain instruction per problem, said to the player as they see themselves in the mirror. */
export const ISSUE_TEXT: Record<SpotIssue | "moving", string> = {
  missing: "Step into the outline",
  unclear: "Face the camera so it can see your head and shoulders",
  "step-left": "Move a little to your left",
  "step-right": "Move a little to your right",
  closer: "Come a little closer",
  back: "Step back a little",
  headroom: "Step back a little so there is room above your head",
  moving: "Hold still",
};

export function instruction(phase: CalibrationPhase, issue: SpotIssue | "moving" | null): string {
  if (phase === "done") return "Got it";
  if (issue) return ISSUE_TEXT[issue];
  return "Stand tall and hold still";
}

/** The big heading: the step most players still need. */
export function heading(phases: readonly CalibrationPhase[], players: number): { title: string; text: string } {
  if (phases.every((phase) => phase === "done")) return { title: "All set", text: "Your head line is set. Here we go." };
  if (phases.some((phase) => phase === "find")) {
    return {
      title: players > 1 ? "Stand in your spots" : "Stand in your spot",
      text:
        players > 1
          ? "Player 1 on the left, player 2 on the right. Waist up is all the camera needs to see."
          : "Face the screen. Waist up is all the camera needs to see.",
    };
  }
  return { title: "Stand tall and hold still", text: "The ring fills while you keep still. Where your head rests becomes your head line." };
}
