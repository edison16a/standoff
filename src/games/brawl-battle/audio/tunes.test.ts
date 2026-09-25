import { describe, expect, it } from "vitest";
import { STAGE_IDS } from "../engine/stages";
import { battleTune, LOBBY_TUNE, type Tune } from "./tunes";

function check(tune: Tune): void {
  expect(tune.hook).toHaveLength(tune.chords.length * 16);
  expect(tune.bass).toHaveLength(16);
  for (const step of [...tune.kick, ...tune.kickFill]) expect(step).toBeLessThan(16);
  // Kept out of the shrill top octave and above the rumble, so it never sounds harsh.
  for (const note of tune.hook) if (note !== null) expect(note + tune.key).toBeLessThanOrEqual(86);
  for (const [root] of tune.chords) expect(root! + tune.key).toBeGreaterThanOrEqual(33);
}

describe("the music", () => {
  it("has whole bars in every tune", () => {
    check(LOBBY_TUNE);
    for (const stage of STAGE_IDS) check(battleTune(stage));
  });

  it("gives each stage its own take on the battle theme", () => {
    const takes = STAGE_IDS.map((stage) => battleTune(stage));
    expect(new Set(takes.map((t) => t.lead)).size).toBe(STAGE_IDS.length);
    expect(new Set(takes.map((t) => t.hook)).size).toBe(1);
  });
});
