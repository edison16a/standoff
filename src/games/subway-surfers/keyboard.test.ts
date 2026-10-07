import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { keyboardHelloSchema, keyMoveSchema } from "./host/key-messages";
import { keyboard } from "./keyboard";

function seat() {
  const sent: Payload[] = [];
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: () => null };
  const player = keyboard.create(ctx);
  return { sent, player, press: (code: string, down: boolean) => player.key?.(code, down) };
}

describe("Subway Runner keyboard binding", () => {
  it("says hello first, so the lobby switches to keyboard mode", () => {
    const { sent } = seat();
    expect(sent).toEqual([{ kind: "keyboard" }]);
    expect(keyboardHelloSchema.safeParse(sent[0]).success).toBe(true);
  });

  it("sends each move down and up, from WASD, the arrows and Space", () => {
    const { sent, press } = seat();
    const cases: [string, string][] = [
      ["KeyA", "left"],
      ["ArrowLeft", "left"],
      ["KeyD", "right"],
      ["ArrowRight", "right"],
      ["KeyW", "jump"],
      ["ArrowUp", "jump"],
      ["Space", "jump"],
      ["KeyS", "duck"],
      ["ArrowDown", "duck"],
    ];
    for (const [code, move] of cases) {
      sent.length = 0;
      expect(press(code, true)).toBe(true);
      expect(press(code, false)).toBe(true);
      expect(sent).toEqual([
        { kind: "key-move", move, down: true },
        { kind: "key-move", move, down: false },
      ]);
      for (const payload of sent) expect(keyMoveSchema.safeParse(payload).success).toBe(true);
    }
  });

  it("holds a roll until the last of its keys is up", () => {
    const { sent, press } = seat();
    sent.length = 0;
    press("KeyS", true);
    press("ArrowDown", true);
    press("KeyS", false);
    expect(sent).toEqual([{ kind: "key-move", move: "duck", down: true }]);
    press("ArrowDown", false);
    expect(sent.at(-1)).toEqual({ kind: "key-move", move: "duck", down: false });
  });

  it("leaves other keys alone and lets go of a held roll on release", () => {
    const { sent, player, press } = seat();
    sent.length = 0;
    expect(press("KeyQ", true)).toBe(false);
    press("KeyS", true);
    player.release?.();
    expect(sent).toEqual([
      { kind: "key-move", move: "duck", down: true },
      { kind: "key-move", move: "duck", down: false },
    ]);
  });
});
