import { describe, expect, it } from "vitest";
import { melody, pitch } from "./score";
import { FINAL_TUNE, LOBBY_TUNE, MATCH_TUNE, type Tune } from "./tunes";

function check(tune: Tune): void {
  // Sixteen bars before it repeats, an A half and a B half.
  expect(tune.chords).toHaveLength(16);
  expect(tune.hook).toHaveLength(tune.chords.length * 16);
  // Kept out of the shrill top octave and above the rumble, so it never sounds harsh.
  for (const note of tune.hook) if (note) expect(note.midi + tune.key).toBeLessThanOrEqual(86);
  for (const [root] of tune.chords) expect(root! + tune.key).toBeGreaterThanOrEqual(33);
  // No note is held over the loop point.
  tune.hook.forEach((note, step) => note && expect(step + note.steps).toBeLessThanOrEqual(tune.hook.length));
}

describe("the music", () => {
  it("reads a melody written as text", () => {
    expect(pitch("F2")).toBe(41);
    expect(pitch("G#5")).toBe(80);
    expect(melody("C4:2 | -:1 E4:1")).toEqual([{ midi: 60, steps: 2 }, null, null, { midi: 64, steps: 1 }]);
  });

  it("has whole bars in every tune", () => {
    for (const tune of [LOBBY_TUNE, MATCH_TUNE, FINAL_TUNE]) check(tune);
  });

  it("gives the B half its own tune", () => {
    for (const tune of [LOBBY_TUNE, MATCH_TUNE]) {
      const half = tune.hook.length / 2;
      expect(tune.hook.slice(0, half).map((n) => n?.midi)).not.toEqual(tune.hook.slice(half).map((n) => n?.midi));
    }
  });

  it("keeps the lobby slow and calm", () => {
    expect(LOBBY_TUNE.bpm).toBeLessThan(90);
    expect(LOBBY_TUNE.style).toBe("lobby");
  });

  it("plays the match point take of the theme higher and faster, with the same hook", () => {
    expect(FINAL_TUNE.hook).toBe(MATCH_TUNE.hook);
    expect(FINAL_TUNE.key).toBeGreaterThan(MATCH_TUNE.key);
    expect(FINAL_TUNE.bpm).toBeGreaterThan(MATCH_TUNE.bpm);
  });
});
