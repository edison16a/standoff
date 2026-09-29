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
  3: { from: PILOT, text: "Out the back door and keep moving. They get faster the longer this goes on." },
  4: { from: PILOT, text: "Cut through the park. Something tall came out of the hospital. It still has its saw." },
  5: { from: PILOT, text: "Something huge is at the fountain. Break its joints, and watch for runners behind it." },
  6: { from: PILOT, text: "Army roadblock ahead. Some of them still wear riot vests. Go for the head." },
  7: { from: PILOT, text: "A big one with a cargo hook is loose on Fifth. Break its joints." },
  8: { from: PILOT, text: "Hospital dead ahead. Big ones in the ambulance bay. Heads, not bodies." },
  9: { from: PILOT, text: "Take the parking ramp up to the roof. That surgeon is back. I am spinning up now." },
  10: { from: PILOT, text: "I am coming in. Something huge is on the roof. Clear it so I can land!" },
  11: { from: PILOT, text: "Hold on. I cannot put down on the ship. I will drop you at the docks." },
  12: { from: HARBOR, text: "This is the Northern Star at pier nine. We see you. Watch the one with the hook." },
  13: { from: HARBOR, text: "They are pouring through the port gate. Fast ones. Keep your aim up." },
  14: { from: HARBOR, text: "Crane yard. Two big ones this time. Reload before you move." },
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
