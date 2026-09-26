import { describe, expect, it } from "vitest";
import { MENU_TRACK, STILL_WATER } from "./menu-track";
import { melody } from "./score";
import { MATCH_TRACK } from "./tracks";

describe("the music", () => {
  it("reads a melody written as text", () => {
    expect(melody("D5:2 | -:1 G5:1")).toEqual([{ midi: 74, steps: 2 }, null, null, { midi: 79, steps: 1 }]);
  });

  it("runs both tracks sixteen bars before they repeat", () => {
    expect(MENU_TRACK.length).toBe(16 * 16);
    expect(MATCH_TRACK.length).toBe(16 * 16);
    expect(STILL_WATER).toHaveLength(MENU_TRACK.length);
  });

  it("keeps the lobby slow, its tune out of the shrill top and inside the loop", () => {
    expect(MENU_TRACK.bpm).toBeLessThan(MATCH_TRACK.bpm * 0.6);
    STILL_WATER.forEach((note, step) => {
      if (!note) return;
      expect(note.midi).toBeLessThanOrEqual(86);
      expect(step + note.steps).toBeLessThanOrEqual(STILL_WATER.length);
    });
  });

  it("gives the lobby's B half its own tune", () => {
    const half = STILL_WATER.length / 2;
    expect(STILL_WATER.slice(0, half).map((n) => n?.midi)).not.toEqual(STILL_WATER.slice(half).map((n) => n?.midi));
  });
});
