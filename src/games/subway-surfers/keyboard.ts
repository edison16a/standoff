import type { KeyboardBinding } from "@/platform/keyboard";

/**
 * Subway Runner is played in front of the camera, and already has a
 * keyboard mode of its own (`host/key-input.ts`) that reads the host
 * page's keys. The keyboard player's card shows those keys; the binding
 * sends nothing, so the keys reach that mode untouched.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Before the run",
      rows: [
        { action: "Pick Keyboard in the menu, then Start", keys: ["Left click"] },
        { action: "Play again on the results", keys: ["W", "Up"] },
      ],
    },
    {
      title: "Run",
      rows: [
        { action: "One track left", keys: ["A", "Left"] },
        { action: "One track right", keys: ["D", "Right"] },
        { action: "Jump", keys: ["W", "Up"] },
        { action: "Roll (hold)", keys: ["S", "Down"] },
      ],
    },
  ],
  create: () => ({}),
};
