import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Boxing is a camera game with its own keyboard mode on the big screen
 * (`host/keys`), so the keyboard player only shows its keys. The binding
 * sends nothing and claims no key, which leaves every key to the game.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Start",
      rows: [
        { action: "First screen", keys: ["Play with the keyboard"] },
        { action: "Browse builds", keys: [["A", "D"]] },
        { action: "Lock in", keys: ["Enter"] },
      ],
    },
    {
      title: "Punch",
      rows: [
        { action: "Jab", keys: ["J"] },
        { action: "Cross", keys: ["K"] },
        { action: "Hook", keys: ["L"] },
        { action: "Body uppercut", keys: ["I"] },
      ],
    },
    {
      title: "Defend",
      rows: [
        { action: "Slip", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Duck (hold)", keys: ["S", "Down"] },
        { action: "Dodge under", keys: ["Space"] },
        { action: "Block, get up", keys: ["Shift"] },
        { action: "Cover the body", keys: ["F"] },
        { action: "Touch gloves", keys: ["E"] },
      ],
    },
  ],
  create: () => ({}),
};
