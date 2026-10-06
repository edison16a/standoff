import { ButtonKeys, type ButtonMap, type KeyboardBinding } from "@/platform/keyboard";
import { BOX_KEYS, KEYS, type BoxKey } from "./host/key-boxer";
import type { BoxKeyMessage, KeyboardHello } from "./host/key-messages";

/** Exactly the keys of keyboard mode on the computer, grouped by what they do. */
function byKey(): ButtonMap<BoxKey> {
  const map = Object.fromEntries(BOX_KEYS.map((key) => [key, [] as string[]])) as Record<BoxKey, string[]>;
  for (const [code, key] of Object.entries(KEYS)) map[key].push(code);
  return map;
}

const BOX_BUTTONS = byKey();

/**
 * Boxing for the admin panel's Keyboard player. Boxing is played in front
 * of the camera, so the test seat says hello (the menu switches to
 * keyboard mode, one player against the computer) and then sends every
 * key of keyboard mode down and up. The host turns them into the boxer's
 * head, gloves and punches (`host/key-boxer.ts`).
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Punch",
      rows: [
        { action: "Jab", keys: ["J"] },
        { action: "Cross", keys: ["K"] },
        { action: "Left hook", keys: ["U"] },
        { action: "Right hook", keys: ["I"] },
        { action: "Left uppercut", keys: ["N"] },
        { action: "Right uppercut", keys: ["M"] },
        { action: "To the body", keys: [["S", "punch"]] },
      ],
    },
    {
      title: "Defend",
      rows: [
        { action: "Slip", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Duck", keys: ["S", "Down"] },
        { action: "Guard, get up", keys: ["Space"] },
        { action: "Guard the sides", keys: ["Shift"] },
        { action: "Guard the body", keys: ["F"] },
        { action: "Touch gloves", keys: ["E"] },
      ],
    },
    {
      title: "Menus",
      rows: [
        { action: "Browse builds", keys: [["A", "D"]] },
        { action: "Lock in", keys: ["Space"] },
        { action: "Everything else", keys: ["Left click"] },
      ],
    },
  ],
  foot: "Menus are on the big screen. Click them with the mouse.",
  create(ctx) {
    ctx.send({ kind: "keyboard" } satisfies KeyboardHello);
    const send = (key: BoxKey, down: boolean) => ctx.send({ kind: "box-key", key, down } satisfies BoxKeyMessage);
    const keys = new ButtonKeys(BOX_BUTTONS, { press: (key) => send(key, true), release: (key) => send(key, false) });
    return {
      key: (code, down) => keys.key(code, down),
      release: () => keys.release(),
    };
  },
};
