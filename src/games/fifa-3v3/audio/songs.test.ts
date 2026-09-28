import { describe, expect, it } from "vitest";
import { TUNES } from "./music";

describe("soccer songs", () => {
  it("loops each song on sixteen whole bars", () => {
    for (const song of Object.values(TUNES)) expect(song.steps).toBe(16 * 16);
  });

  it("runs the match anthem faster than the lobby bossa", () => {
    expect(TUNES.play.bpm).toBeGreaterThan(TUNES.lobby.bpm);
  });
});
