import type { RadioLine } from "./events";
import { CHOPPER_STAGE } from "./stages";

const PILOT = "Eagle One";
const HARBOR = "Northern Star";

/**
 * What the radio says as the team sets off toward each stage. The pilot
 * talks them to the hospital roof, then the ship's radio talks them to
 * the docks after the chopper goes down.
 */
const ON_THE_WAY: Record<number, RadioLine> = {
  1: { from: PILOT, text: "This is Eagle One. I see your flare. The chopper is on the hospital roof, three blocks north. Move!" },
  2: { from: PILOT, text: "Stay together and watch the road ahead. They come out of the fog." },
  3: { from: PILOT, text: "Turn right at the pharmacy. Two more blocks." },
  4: { from: PILOT, text: "Noise draws them in. Make every shot count." },
  5: { from: PILOT, text: "Something big is moving in the alley. Aim for the glowing joints. That is where it is weak." },
  6: { from: PILOT, text: "Cut through the park. It is the fastest way to the hospital." },
  7: { from: PILOT, text: "Runners in the park. They are fast. Drop them before they close in." },
  8: { from: PILOT, text: "Hospital dead ahead. The ambulance bay is overrun." },
  9: { from: PILOT, text: "Take the parking ramp up to the roof. I am spinning up now." },
  10: { from: PILOT, text: "I am coming in. Clear the roof so I can land!" },
  11: { from: HARBOR, text: "Anyone on this channel? This is the cargo ship Northern Star at pier nine. We sail at dawn. Head for the docks." },
  12: { from: HARBOR, text: "Follow the main road east. The highway takes you to the port." },
  13: { from: HARBOR, text: "Big ones ahead. Two to the body or one to the head." },
  14: { from: HARBOR, text: "You are on the highway. Keep between the barriers." },
  15: { from: HARBOR, text: "There was an army roadblock ahead. The soldiers did not make it. Neither did their heavy." },
  16: { from: HARBOR, text: "Some of them still wear riot vests. Go for the head." },
  17: { from: HARBOR, text: "Halfway along the highway. Keep moving and keep reloading." },
  18: { from: HARBOR, text: "Trucks jackknifed across all lanes. Watch the gaps." },
  19: { from: HARBOR, text: "Last stretch. Take the port exit." },
  20: { from: HARBOR, text: "Something huge broke through the port gate. You have to go through it." },
  21: { from: HARBOR, text: "You made the docks. Pier nine is past the container yard." },
  22: { from: HARBOR, text: "Stay in the lane between the stacks. They hide in the gaps." },
  23: { from: HARBOR, text: "We can see your lights from the bridge. Keep coming." },
  24: { from: HARBOR, text: "Crane yard. Reload before you move. You will not get another chance." },
  25: { from: HARBOR, text: "The gangway is down. Get past that thing and get aboard!" },
};

export function radioFor(stage: number): RadioLine | null {
  return ON_THE_WAY[stage] ?? null;
}

/** Lines for the helicopter's fall, keyed by seconds into the cutscene. */
export const CHOPPER_LINES: readonly [number, RadioLine][] = [
  [0.5, { from: PILOT, text: "Roof is clear. Coming in to land." }],
  [4.2, { from: PILOT, text: "Losing oil pressure. Engine fire! Mayday, mayday!" }],
  [8.5, { from: "Dispatch", text: "Eagle One, come in. Eagle One?" }],
];

export const ESCAPE_LINES: readonly [number, RadioLine][] = [
  [0.5, { from: HARBOR, text: "All aboard! Cast off the lines!" }],
  [11.5, { from: HARBOR, text: "We are clear of the pier. You made it. Welcome aboard." }],
];

/** Shown on the screen as the goal, until the chopper falls and after. */
export function objectiveFor(stage: number): string {
  if (stage < CHOPPER_STAGE) return "Reach the chopper on the hospital roof";
  if (stage === CHOPPER_STAGE) return "Hold the roof until the chopper lands";
  if (stage < 25) return "Reach the Northern Star at pier nine";
  return "Get aboard the ship";
}
