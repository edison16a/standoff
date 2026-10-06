import { describe, expect, it } from "vitest";
import { keyboard } from "./keyboard";
import { KEYS } from "./host/key-input";

describe("Subway Runner keyboard card", () => {
  it("leaves every key to the game's own keyboard mode", () => {
    const player = keyboard.create({ seat: 1, send: () => undefined, sendLossy: () => undefined, last: () => null });
    // No key handler: the platform never claims a key, so the host page's own listener hears it.
    expect(player.key).toBeUndefined();
    expect(keyboard.replaces).toBeUndefined();
  });

  it("shows the keys that mode reads", () => {
    const shown = keyboard.controls.flatMap((group) => group.rows.flatMap((row) => row.keys.flat()));
    const names: Record<string, string> = { ArrowLeft: "Left", ArrowRight: "Right", ArrowUp: "Up", ArrowDown: "Down", KeyA: "A", KeyD: "D", KeyW: "W", KeyS: "S" };
    for (const code of Object.keys(KEYS)) expect(shown).toContain(names[code]);
  });
});
