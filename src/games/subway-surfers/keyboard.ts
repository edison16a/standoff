import { ButtonKeys, type ButtonMap, type KeyboardBinding } from "@/platform/keyboard";
import { KEYS, type KeyMove } from "./host/key-input";
import type { KeyboardHello, KeyMoveMessage } from "./host/key-messages";

/** Exactly the keys of keyboard mode on the computer, grouped by move. */
function byMove(): ButtonMap<KeyMove> {
  const map: Record<KeyMove, string[]> = { left: [], right: [], jump: [], duck: [] };
  for (const [code, move] of Object.entries(KEYS)) map[move].push(code);
  return map;
}

const MOVE_KEYS = byMove();

/**
 * Subway Runner for the admin panel's Keyboard player. It is a camera
 * game with a keyboard mode on the computer, so the test seat says hello
 * (the lobby switches to keyboard mode) and then sends each move, down
 * and up, for keyboard mode to play. A held roll lasts as long as the key.
 */
export const keyboard: KeyboardBinding = {
  controls: [
    {
      title: "Run",
      rows: [
        { action: "Change track", keys: [["A", "D"], ["Left", "Right"]] },
        { action: "Jump", keys: ["W", "Up", "Space"] },
        { action: "Roll (hold)", keys: ["S", "Down"] },
      ],
    },
    {
      title: "Menus",
      rows: [
        { action: "Pick and start", keys: ["Left click"] },
        { action: "Play again", keys: ["W", "Space"] },
      ],
    },
  ],
  create(ctx) {
    ctx.send({ kind: "keyboard" } satisfies KeyboardHello);
    const move = (to: KeyMove, down: boolean) => ctx.send({ kind: "key-move", move: to, down } satisfies KeyMoveMessage);
    const moves = new ButtonKeys(MOVE_KEYS, { press: (to) => move(to, true), release: (to) => move(to, false) });
    return {
      key: (code, down) => moves.key(code, down),
      release: () => moves.release(),
    };
  },
};
