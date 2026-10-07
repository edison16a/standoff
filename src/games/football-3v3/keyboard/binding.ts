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
        { action: "Juke", keys: ["E"] },
        { action: "Dive", keys: ["Q"] },
      ],
    },
    {
      title: "QB",
      rows: [
        { action: "Hike", keys: ["Space"] },
        { action: "Hold to aim, let go to throw", keys: ["Space", "Left click"] },
        { action: "Aim the throw", keys: [["Up", "Left", "Down", "Right"], "Mouse"] },
        { action: "Pitch on a run call", keys: ["Space"] },
        { action: "Take off and run", keys: ["Shift"] },
      ],
    },
    {
      title: "Defence",
      rows: [
        { action: "Tackle", keys: ["F", "Space"] },
        { action: "Rush", keys: ["Shift"] },
        { action: "Guard, held", keys: ["G"] },
      ],
    },
    {
      title: "Calls and kicks",
      rows: [
        { action: "Throw, Run, Kick", keys: [["1", "2", "3"]] },
        { action: "After a touchdown: kick, go for two", keys: [["1", "2"]] },
        { action: "Stop the kick meter", keys: ["Space"] },
        { action: "Skip the replay", keys: ["Space"] },
      ],
    },
  ],
  // The panel's resting stick and throw stick would fight the keys.
  replaces: ["pad", "aim"],
  create: (ctx) => new FootballKeys(ctx),
};
