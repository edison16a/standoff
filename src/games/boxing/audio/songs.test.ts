import { describe, expect, it } from "vitest";
import { FIGHT_SONG, harmony } from "./fight-song";
import { LOBBY_SONG } from "./lobby-song";
import { note } from "./score";

describe("boxing songs", () => {
  it("loops on whole bars, sixteen bars each, A and B sections of eight", () => {
    for (const song of [LOBBY_SONG, FIGHT_SONG]) expect(song.steps).toBe(16 * 16);
  });

  it("gives the lobby and the fight their own tempo", () => {
    expect(LOBBY_SONG.bpm).toBeLessThan(FIGHT_SONG.bpm);
  });

  it("puts the second horn on a chord tone under the lead", () => {
    const cm9 = ["C2", "Eb3", "G3", "Bb3", "D4"].map(note);
    const under = harmony(note("C5"), cm9);
    expect(note("C5") - under).toBeGreaterThanOrEqual(3);
    expect(under).toBe(note("G4"));
  });
});
