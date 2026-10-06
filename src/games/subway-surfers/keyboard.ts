import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Subway Runner is a camera game with its own keyboard mode on the big
 * screen (`host/key-input.ts`), so the keyboard player only shows its
 * keys. The binding sends nothing and claims no key, which leaves every
 * key to the game's own listener.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Start",
      rows: [{ action: "In the lobby, pick", keys: ["Keyboard"] }],
    },
    {
      title: "Run",
      rows: [
        { action: "Change track", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Jump", keys: ["W", "Up"] },
        { action: "Roll (hold)", keys: ["S", "Down"] },
      ],
    },
  ],
  create: () => ({}),
};
