import type { KeyboardBinding } from "@/platform/keyboard";
import { NbaKeyboardSeat } from "./keyboard-seat";

/**
 * Basketball 3v3 on the keyboard, for testing on one computer. The keys
 * mean the same thing on both ends of the floor and become whichever
 * phone button does that job in the play (see `keyboard-seat.ts`).
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Move",
      rows: [
        { action: "Run", keys: [["W", "A", "S", "D"], ["Up", "Left", "Down", "Right"]] },
        { action: "Sprint", keys: ["Shift"] },
      ],
    },
    {
      title: "With the ball",
      rows: [
        { action: "Shoot: hold, let go in the green", keys: ["Space", "J"] },
        { action: "Pass", keys: ["E", "K"] },
        { action: "Skill move", keys: ["Q"] },
      ],
    },
    {
      title: "Without it",
      rows: [
        { action: "Guard: hold", keys: ["F", "Right click"] },
        { action: "Block or rebound", keys: ["Space", "J"] },
        { action: "Steal on defence, call for it on offence", keys: ["E", "K"] },
      ],
    },
    {
      title: "Menus",
      rows: [{ action: "Ready, or skip the replay", keys: ["Enter"] }],
    },
  ],
  // The keys stream the stick and press the buttons; the panel keeps the build pick and Ready.
  replaces: ["pad", "pad-press", "release"],
  create: (ctx) => new NbaKeyboardSeat(ctx),
};
