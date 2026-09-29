import { describe, expect, it } from "vitest";
import { TUNES } from "./music";

describe("football songs", () => {
  it("loops each song on sixteen whole bars", () => {
    for (const song of Object.values(TUNES)) expect(song.steps).toBe(16 * 16);
  });

  it("runs the broadcast theme well ahead of the lobby groove", () => {
    expect(TUNES.game.bpm).toBeGreaterThan(TUNES.lobby.bpm + 30);
  });
});
