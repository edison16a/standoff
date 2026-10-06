import { describe, expect, it, vi } from "vitest";
import { KEYS } from "./host/controls";
import { keyboard } from "./keyboard";

describe("Cube Game keyboard card", () => {
  it("leaves every key to the game's own listener", () => {
    const send = vi.fn();
    const player = keyboard.create({ seat: 1, send, sendLossy: send, last: () => null });
    expect(player.key?.("Space", true)).toBeFalsy();
    expect(send).not.toHaveBeenCalled();
    expect(keyboard.replaces ?? []).toEqual([]);
  });

  it("names the keys the game listens for", () => {
    expect(KEYS).toMatchObject({ Space: 1, KeyW: 1, Enter: 2, ArrowUp: 2 });
    const jump = keyboard.controls.find((group) => group.title === "Jump")!;
    expect(jump.rows.map((row) => row.keys)).toEqual([
      ["Space", "W"],
      ["Enter", "Up"],
    ]);
  });
});
