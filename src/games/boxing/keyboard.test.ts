import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { boxKeySchema, keyboardHelloSchema } from "./host/key-messages";
import { keyboard } from "./keyboard";

function seat() {
  const sent: Payload[] = [];
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: () => null };
  const player = keyboard.create(ctx);
  return { sent, player, press: (code: string, down: boolean) => player.key?.(code, down) };
}

describe("Boxing keyboard binding", () => {
  it("says hello first, so the menu switches to keyboard mode", () => {
    const { sent } = seat();
    expect(sent).toEqual([{ kind: "keyboard" }]);
    expect(keyboardHelloSchema.safeParse(sent[0]).success).toBe(true);
  });

  it("sends every key of keyboard mode down and up", () => {
    const cases: [string, string][] = [
      ["KeyA", "slip-left"],
      ["ArrowLeft", "slip-left"],
      ["KeyD", "slip-right"],
      ["ArrowRight", "slip-right"],
      ["KeyS", "duck"],
      ["ArrowDown", "duck"],
      ["KeyJ", "jab"],
      ["KeyK", "cross"],
      ["KeyU", "hook-left"],
      ["KeyI", "hook-right"],
      ["Space", "guard"],
      ["ShiftLeft", "high"],
      ["ShiftRight", "high"],
      ["KeyF", "body"],
      ["KeyE", "touch"],
    ];
    const { sent, press } = seat();
    for (const [code, key] of cases) {
      sent.length = 0;
      expect(press(code, true)).toBe(true);
      expect(press(code, false)).toBe(true);
      expect(sent).toEqual([
        { kind: "box-key", key, down: true },
        { kind: "box-key", key, down: false },
      ]);
      for (const payload of sent) expect(boxKeySchema.safeParse(payload).success).toBe(true);
    }
  });

  it("holds a slip until the last of its keys is up", () => {
    const { sent, press } = seat();
    sent.length = 0;
    press("KeyA", true);
    press("ArrowLeft", true);
    press("KeyA", false);
    expect(sent).toEqual([{ kind: "box-key", key: "slip-left", down: true }]);
    press("ArrowLeft", false);
    expect(sent.at(-1)).toEqual({ kind: "box-key", key: "slip-left", down: false });
  });

  it("leaves other keys alone and lets go of a held guard on release", () => {
    const { sent, player, press } = seat();
    sent.length = 0;
    expect(press("KeyQ", true)).toBe(false);
    press("Space", true);
    player.release?.();
    expect(sent).toEqual([
      { kind: "box-key", key: "guard", down: true },
      { kind: "box-key", key: "guard", down: false },
    ]);
  });
});
