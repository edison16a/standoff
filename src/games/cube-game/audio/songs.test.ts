import { describe, expect, it } from "vitest";
import { LEVELS } from "../levels";
import { chord, line, note } from "./notes";
import { sectionAt } from "./song";
import { SONGS } from "./songs";

describe("songs", () => {
  it("reads note names", () => {
    expect(note("C4")).toBe(60);
    expect(note("F#3")).toBe(54);
    expect(note("Bb1")).toBe(34);
    expect(chord("C4 E4 G4")).toEqual([60, 64, 67]);
    expect(line("C4 - - . D4")).toEqual([{ midi: 60, length: 3 }, null, null, null, { midi: 62, length: 1 }]);
  });

  for (const { info } of LEVELS) {
    it(`gives ${info.name} its own song at its tempo, long enough to finish it`, () => {
      const song = SONGS[info.theme]!;
      expect(song.bpm).toBe(info.bpm);
      const level = LEVELS.find((l) => l.info.id === info.id)!.build();
      expect(song.length).toBeGreaterThanOrEqual(level.beats);
      // The last section before the finish still plays drums, so the ending lands with energy.
      expect(sectionAt(song, level.beats - 1).parts.has("kick") || sectionAt(song, level.beats - 1).parts.has("half")).toBe(true);
    });
  }

  it("gives the menu song a hook and an answer, each played twice", () => {
    const menu = SONGS.menu!;
    const leads = [0, 16, 32, 48].map((beat) => (sectionAt(menu, beat).parts.has("lead") ? "A" : "B"));
    expect(leads).toEqual(["A", "B", "A", "B"]);
    expect(menu.leadB.some(Boolean)).toBe(true);
  });

  it("keeps every melody a whole number of bars", () => {
    for (const song of Object.values(SONGS)) {
      expect(song.lead.length % 16).toBe(0);
      expect(song.leadB.length % 16).toBe(0);
      expect(song.bass.length).toBe(16);
      expect(song.arp.length).toBe(16);
      for (const pattern of Object.values(song.drums)) expect(pattern).toHaveLength(16);
    }
  });
});
