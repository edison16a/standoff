import { describe, expect, it } from "vitest";
import { STAGE_IDS } from "../engine/stages";
import { melody, pitch } from "./score";
import { battleTune, LOBBY_TUNE, type Tune } from "./tunes";

function check(tune: Tune): void {
  // Sixteen bars before it repeats, an A half and a B half.
  expect(tune.chords).toHaveLength(16);
  expect(tune.hook).toHaveLength(tune.chords.length * 16);
  expect(tune.bass).toHaveLength(16);
  // Kept out of the shrill top octave and above the rumble, so it never sounds harsh.
  for (const note of tune.hook) if (note) expect(note.midi).toBeLessThanOrEqual(86);
  for (const [root] of tune.chords) expect(root).toBeGreaterThanOrEqual(33);
  // No note is held over the loop point.
  tune.hook.forEach((note, step) => note && expect(step + note.steps).toBeLessThanOrEqual(tune.hook.length));
}

describe("the music", () => {
  it("reads a melody written as text", () => {
    expect(pitch("C4")).toBe(60);
    expect(pitch("A#4")).toBe(70);
    expect(melody("C4:2 | -:1 E4:1")).toEqual([{ midi: 60, steps: 2 }, null, null, { midi: 64, steps: 1 }]);
  });

  it("has whole bars in every tune", () => {
    check(LOBBY_TUNE);
    for (const stage of STAGE_IDS) check(battleTune(stage));
  });

  it("gives the B half its own tune", () => {
    for (const tune of [LOBBY_TUNE, battleTune("dojo-rooftop")]) {
      const half = tune.hook.length / 2;
      expect(tune.hook.slice(0, half).map((n) => n?.midi)).not.toEqual(tune.hook.slice(half).map((n) => n?.midi));
    }
  });

  it("keeps the lobby slow and the battle fast", () => {
    expect(LOBBY_TUNE.bpm).toBeLessThan(100);
    for (const stage of STAGE_IDS) expect(battleTune(stage).bpm).toBeGreaterThanOrEqual(150);
  });

  it("gives each stage its own take on the battle theme", () => {
    const takes = STAGE_IDS.map((stage) => battleTune(stage));
    expect(new Set(takes.map((t) => t.lead)).size).toBe(STAGE_IDS.length);
    expect(new Set(takes.map((t) => t.hook)).size).toBe(1);
  });
});
