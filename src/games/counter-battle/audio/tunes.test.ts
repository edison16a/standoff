import { describe, expect, it } from "vitest";
import { FINAL_TUNE, LOBBY_TUNE, MATCH_TUNE, type Tune } from "./tunes";

function check(tune: Tune): void {
  expect(tune.hook).toHaveLength(tune.chords.length * 16);
  expect(tune.bass).toHaveLength(16);
  for (const step of [...tune.kick, ...tune.snare]) expect(step).toBeLessThan(16);
  // Kept out of the shrill top octave and above the rumble, so it never sounds harsh.
  for (const note of tune.hook) if (note !== null) expect(note + tune.key).toBeLessThanOrEqual(86);
  for (const [root] of tune.chords) expect(root! + tune.key).toBeGreaterThanOrEqual(33);
}

describe("the music", () => {
  it("has whole bars in every tune", () => {
    for (const tune of [LOBBY_TUNE, MATCH_TUNE, FINAL_TUNE]) check(tune);
  });

  it("plays the match point take of the theme higher and faster, with the same hook", () => {
    expect(FINAL_TUNE.hook).toBe(MATCH_TUNE.hook);
    expect(FINAL_TUNE.key).toBeGreaterThan(MATCH_TUNE.key);
    expect(FINAL_TUNE.bpm).toBeGreaterThan(MATCH_TUNE.bpm);
  });
});
