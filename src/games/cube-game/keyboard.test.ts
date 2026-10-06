import { describe, expect, it } from "vitest";
import { keyboard } from "./keyboard";

describe("Cube Game keyboard card", () => {
  it("leaves every key to the game's own key reading", () => {
    const player = keyboard.create({ seat: 1, send: () => undefined, sendLossy: () => undefined, last: () => null });
    // No key handler: the platform never claims a key, so the host page's own listener hears it.
    expect(player.key).toBeUndefined();
  });

  it("shows both players' jump keys", () => {
    const rows = keyboard.controls.flatMap((group) => group.rows);
    expect(rows.find((row) => row.action === "Player 1")?.keys).toEqual(["Space", "W"]);
    expect(rows.find((row) => row.action.startsWith("Player 2"))?.keys).toEqual(["Enter", "Up"]);
  });
});
