import { describe, expect, it } from "vitest";
import { TUNES } from "./music";

describe("basketball songs", () => {
  it("loops each song on sixteen whole bars", () => {
    for (const song of Object.values(TUNES)) expect(song.steps).toBe(16 * 16);
  });

  it("keeps the game song off the arena beat's tempo, so the two never drift in and out of step", () => {
    expect(TUNES.play.bpm).not.toBe(84);
    expect(TUNES.play.bpm).toBeGreaterThan(TUNES.lobby.bpm);
  });
});
