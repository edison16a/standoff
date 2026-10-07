import { afterEach, describe, expect, it, vi } from "vitest";
import type { Payload } from "@/platform/protocol";
import { keyJumpSchema } from "./host/key-messages";
import { keyboard } from "./keyboard";

afterEach(() => vi.restoreAllMocks());

function seat() {
  const sent: Payload[] = [];
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => sent.push(p), last: () => null };
  const player = keyboard.create(ctx);
  return { sent, player, press: (code: string, down: boolean) => player.key?.(code, down) };
}

describe("Cube Game keyboard binding", () => {
  it("sends nothing until a key goes down", () => {
    expect(seat().sent).toEqual([]);
  });

  it("jumps player 1 on Space and W, player 2 on Enter, Up and keypad 0, timed from the key", () => {
    vi.spyOn(performance, "now").mockReturnValue(1234);
    const { sent, press } = seat();
    for (const [code, player] of [
      ["Space", 1],
      ["KeyW", 1],
      ["Enter", 2],
      ["ArrowUp", 2],
      ["Numpad0", 2],
    ] as const) {
      sent.length = 0;
      expect(press(code, true)).toBe(true);
      expect(press(code, false)).toBe(true);
      expect(sent).toEqual([{ kind: "key-jump", player, at: 1234 }]);
      expect(keyJumpSchema.safeParse(sent[0]).success).toBe(true);
    }
  });

  it("jumps on every key down, even with another jump key held", () => {
    const { sent, press } = seat();
    press("Space", true);
    press("KeyW", true);
    press("Space", false);
    press("Space", true);
    expect(sent).toHaveLength(3);
  });

  it("leaves other keys to the page", () => {
    const { sent, press } = seat();
    expect(press("KeyA", true)).toBe(false);
    expect(press("KeyR", true)).toBe(false);
    expect(sent).toEqual([]);
  });
});
