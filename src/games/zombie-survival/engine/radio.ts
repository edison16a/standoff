import type { RadioLine } from "./events";
import { CHOPPER_STAGE, STAGE_COUNT } from "./stages";

const PILOT = "Eagle One";
const HARBOR = "Northern Star";

/**
 * What the radio says as the team sets off toward each stage. The pilot
 * talks them to the hospital roof and flies them to the docks, then the
 * ship's radio talks them down to pier nine.
 */
const ON_THE_WAY: Record<number, RadioLine> = {
  1: { from: PILOT, text: "This is Eagle One. I see your flare. They are all over Main Street. Fight your way to the hospital roof!" },
  2: { from: PILOT, text: "Something big is in the alley. Aim for the glowing joints. That is where it is weak." },
  3: { from: PILOT, text: "Out the back door and keep moving. Noise draws them in." },
  4: { from: PILOT, text: "Cut through the park. It is the fastest way to the hospital." },
  5: { from: PILOT, text: "Runners at the fountain. Drop them before they close in." },
  6: { from: PILOT, text: "Army roadblock ahead. The soldiers did not make it. Neither did their heavy." },
  7: { from: PILOT, text: "Some of them wear riot vests. Go for the head." },
  8: { from: PILOT, text: "Hospital dead ahead. Big ones in the ambulance bay. Heads, not bodies." },
  9: { from: PILOT, text: "Take the parking ramp up to the roof. I am spinning up now." },
  10: { from: PILOT, text: "I am coming in. Clear the roof so I can land!" },
  11: { from: PILOT, text: "Hold on. I cannot put down on the ship. I will drop you at the docks." },
  12: { from: HARBOR, text: "This is the Northern Star at pier nine. We see you. Get through the container yard." },
  13: { from: HARBOR, text: "Something huge broke through the port gate. You have to go through it." },
  14: { from: HARBOR, text: "Crane yard. Reload before you move. You will not get another chance." },
  15: { from: HARBOR, text: "The gangway is down. Get past that thing and get aboard!" },
};

export function radioFor(stage: number): RadioLine | null {
  return ON_THE_WAY[stage] ?? null;
}

/** Lines for the landing and the lift off, keyed by seconds into the cutscene. */
export const CHOPPER_LINES: readonly [number, RadioLine][] = [
  [0.4, { from: PILOT, text: "Roof is clear. Coming in to land." }],
  [3.2, { from: PILOT, text: "Everybody in! Move!" }],
  [5.6, { from: HARBOR, text: "Eagle One, this is the Northern Star. We sail from pier nine at dawn." }],
];

export const ESCAPE_LINES: readonly [number, RadioLine][] = [
  [0.5, { from: HARBOR, text: "All aboard! Cast off the lines!" }],
  [11.5, { from: HARBOR, text: "We are clear of the pier. You made it. Welcome aboard." }],
];

/** Shown on the screen as the goal: the chopper first, then the ship. */
export function objectiveFor(stage: number): string {
  if (stage < CHOPPER_STAGE) return "Reach the chopper on the hospital roof";
  if (stage === CHOPPER_STAGE) return "Hold the roof until the chopper lands";
  if (stage < STAGE_COUNT) return "Reach the Northern Star at pier nine";
  return "Beat the Behemoth and get aboard";
}
