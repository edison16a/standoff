import { describe, expect, it } from "vitest";
import { LOBBY_SONG } from "./lobby-song";
import { RACE_SONG } from "./race-song";
import { phrase } from "./song";

describe("songs", () => {
  it("runs sixteen bars or more before repeating", () => {
    for (const song of [LOBBY_SONG, RACE_SONG]) {
      expect(song.steps % 16).toBe(0);
      expect(song.steps / 16).toBeGreaterThanOrEqual(16);
    }
  });

  it("keeps the lobby slow and the race quick", () => {
    expect(LOBBY_SONG.bpm).toBeLessThan(90);
    expect(RACE_SONG.bpm).toBeGreaterThan(130);
  });

  it("reads phrases by step", () => {
    const line = phrase([[0, 60, 2], [4, 64, 1]]);
    expect(line.get(4)).toEqual({ note: 64, length: 1 });
    expect(line.get(1)).toBeUndefined();
  });
});
