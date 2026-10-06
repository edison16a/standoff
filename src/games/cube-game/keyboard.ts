import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Cube Game is played in front of the camera, and already reads the host
 * page's keys for play without it (`host/controls.ts`). The keyboard
 * player's card shows those keys; the binding sends nothing, so they
 * reach the game untouched.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Before the level",
      rows: [{ action: "Play with the keyboard, under Play", keys: ["Left click"] }],
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
