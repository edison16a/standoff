import { describe, expect, it, vi } from "vitest";
import { BOX_KEYS } from "./host/keys/key-boxer";
import { keyboard } from "./keyboard";

/** How the card prints a key code. */
const CAP: Record<string, string> = { ArrowLeft: "Left", ArrowRight: "Right", ArrowDown: "Down", ShiftLeft: "Shift", ShiftRight: "Shift", Space: "Space" };
const capOf = (code: string) => CAP[code] ?? code.replace(/^Key/, "");

describe("Boxing keyboard card", () => {
  it("leaves every key to the game's own keyboard mode", () => {
    const send = vi.fn();
    const player = keyboard.create({ seat: 1, send, sendLossy: send, last: () => null });
    expect(player.key?.("KeyJ", true)).toBeFalsy();
    expect(send).not.toHaveBeenCalled();
  });

  it("shows every key keyboard mode reads in a fight", () => {
    const shown = new Set(keyboard.controls.flatMap((group) => group.rows.flatMap((row) => row.keys.flat())));
    for (const code of Object.keys(BOX_KEYS)) expect(shown).toContain(capOf(code));
  });
});
