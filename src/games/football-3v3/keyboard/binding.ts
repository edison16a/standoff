import type { KeyboardBinding } from "@/platform/keyboard";
import { FootballKeys } from "./controller";

/**
 * Football 3v3 on the keyboard, for testing on one computer. The card
 * lists every control; the controller sends what the phone would.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Run",
      rows: [
        { action: "Move", keys: [["W", "A", "S", "D"]] },
        { action: "Juke, ready again in about 2 seconds", keys: ["E"] },
        { action: "Dive", keys: ["Q"] },
      ],
    },
    {
      title: "QB",
      rows: [
        { action: "Hike", keys: ["Space"] },
        { action: "Throw to runner 1, 2, 3 or 4: hold to light him up, let go to throw", keys: [["1", "2", "3", "4"]] },
        { action: "Another number while holding moves the light", keys: [["1", "2", "3", "4"]] },
        { action: "Cancel a held throw", keys: ["Esc"] },
        { action: "Pitch on a run call", keys: ["Space"] },
        { action: "Take off and run", keys: ["Shift"] },
      ],
    },
    {
      title: "Defence",
      rows: [
        { action: "Tackle", keys: ["F", "Space"] },
        { action: "Rush, and break free when held", keys: ["Shift"] },
        { action: "Guard, held", keys: ["G"] },
      ],
    },
    {
      title: "Calls and kicks",
      rows: [
        { action: "Throw, Run, Kick", keys: [["1", "2", "3"]] },
        { action: "Pick a play off the page", keys: [["1", "2"], "Space"] },
        { action: "Refresh: two new plays", keys: ["R"] },
        { action: "Back to Throw, Run, Kick", keys: ["B"] },
        { action: "After a touchdown: kick, go for two", keys: [["1", "2"]] },
        { action: "Stop the kick meter", keys: ["Space"] },
        { action: "Skip the replay", keys: ["Space"] },
      ],
    },
  ],
  // The panel's resting stick would fight the keys.
  replaces: ["pad"],
  create: (ctx) => new FootballKeys(ctx),
};
