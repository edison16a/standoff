import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Boxing is played in front of the camera. Its keyboard mode
 * (`host/key-input.ts`, started from the menu) reads the host page's own
 * keys, so this binding only shows them on the keyboard player's card
 * and sends nothing.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Before the fight",
      rows: [
        { action: "Play with the keyboard, in the menu", keys: ["Left click"] },
        { action: "Browse builds, then lock in", keys: [["A", "D"], "Space"] },
      ],
    },
    {
      title: "Punch",
      rows: [
        { action: "Jab", keys: ["J"] },
        { action: "Cross", keys: ["K"] },
        { action: "Left or right hook", keys: ["U", "I"] },
        { action: "Body shot: punch while ducking", keys: [["S", "J"]] },
      ],
    },
    {
      title: "Defend",
      rows: [
        { action: "Slip left or right", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Duck", keys: ["S", "Down"] },
        { action: "Block high (hold)", keys: ["Space"] },
        { action: "Block the body (hold)", keys: ["Shift"] },
        { action: "Cover an ear from a hook", keys: ["Q", "E"] },
        { action: "Touch gloves (hold)", keys: ["F"] },
        { action: "Get up: let go, then hold", keys: ["Space"] },
      ],
    },
  ],
  create: () => ({}),
};
