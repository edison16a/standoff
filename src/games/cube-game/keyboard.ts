import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Cube Game is a camera game whose own keys always work on the big
 * screen (`host/controls.ts`), so the keyboard player only shows them.
 * The binding sends nothing and claims no key, which leaves every key to
 * the game's own listener.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Start",
      rows: [{ action: "On the level select", keys: ["Play with the keyboard"] }],
    },
    {
      title: "Jump",
      rows: [
        { action: "Player 1", keys: ["Space", "W"] },
        { action: "Player 2 in a 1v1", keys: ["Enter", "Up"] },
      ],
    },
  ],
  create: () => ({}),
};
