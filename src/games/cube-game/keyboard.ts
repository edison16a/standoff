import { ButtonKeys, type ButtonMap, type KeyboardBinding } from "@/platform/keyboard";
import { KEYS } from "./host/controls";
import type { KeyJumpMessage } from "./host/key-messages";

/**
 * Exactly the keys of keyboard play on the computer, each a button of its
 * own, so Space and W pressed in turn jump twice, as they do on the page.
 */
const JUMP_KEYS: ButtonMap<string> = Object.fromEntries(Object.keys(KEYS).map((code) => [code, [code]]));

/**
 * Cube Game for the admin panel's Keyboard player. It is a camera game
 * whose keys already jump on the computer, so the test seat sends each
 * jump with the moment its key went down, and the round times it from
 * there as it does a key on the page. Alone, either player's keys jump.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Play",
      rows: [
        { action: "Jump", keys: ["Space", "W"] },
        { action: "Player 2 jumps in 1v1", keys: ["Enter", "Up"] },
      ],
    },
    {
      title: "Menus",
      rows: [{ action: "Level, then Play with the keyboard", keys: ["Left click"] }],
    },
  ],
  foot: "Menus are on the big screen. Click them with the mouse.",
  create(ctx) {
    const jumps = new ButtonKeys(JUMP_KEYS, {
      press: (code) => ctx.send({ kind: "key-jump", player: KEYS[code] ?? 1, at: performance.now() } satisfies KeyJumpMessage),
    });
    return {
      key: (code, down) => jumps.key(code, down),
      release: () => jumps.release(),
    };
  },
};
