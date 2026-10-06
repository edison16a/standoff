import { describe, expect, it, vi } from "vitest";
import { KEYS } from "./host/key-input";
import { keyboard } from "./keyboard";

/** How the card prints a key code. */
const CAP: Record<string, string> = { ArrowLeft: "Left", ArrowRight: "Right", ArrowUp: "Up", ArrowDown: "Down", KeyA: "A", KeyD: "D", KeyW: "W", KeyS: "S" };

describe("Subway Runner keyboard card", () => {
  it("leaves every key to the game's own keyboard mode", () => {
    const send = vi.fn();
    const player = keyboard.create({ seat: 1, send, sendLossy: send, last: () => null });
    expect(player.key?.("ArrowUp", true)).toBeFalsy();
    expect(send).not.toHaveBeenCalled();
  });

  it("shows every key the keyboard mode reads", () => {
    const shown = new Set(keyboard.controls.flatMap((group) => group.rows.flatMap((row) => row.keys.flat())));
    for (const code of Object.keys(KEYS)) expect(shown).toContain(CAP[code]);
  });
});
