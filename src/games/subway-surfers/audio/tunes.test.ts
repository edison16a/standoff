import { describe, expect, it } from "vitest";
import { arpNote } from "./synth";
import { locate, loopSteps, TUNES } from "./tunes";

describe("tunes", () => {
  it("gives every section a melody exactly as long as its bars", () => {
    for (const tune of Object.values(TUNES)) {
      for (const section of tune.form) {
        expect(section.lead.length).toBe(section.chords.length * 16);
        expect(section.bass.length).toBe(16);
      }
    }
  });

  it("runs at least eight bars with more than one section", () => {
    for (const tune of Object.values(TUNES)) {
      expect(loopSteps(tune)).toBeGreaterThanOrEqual(8 * 16);
      expect(new Set(tune.form.map((s) => s.lead.join())).size).toBeGreaterThan(1);
    }
  });

  it("finds the section for a step and wraps round the loop", () => {
    const run = TUNES.run;
    expect(locate(run, 0).section).toBe(run.form[0]);
    expect(locate(run, 64).section).toBe(run.form[1]);
    expect(locate(run, loopSteps(run) - 1).last).toBe(true);
    expect(locate(run, loopSteps(run)).local).toBe(0);
  });

  it("sparkles the run with the neon synth, and leaves the menu to the band", () => {
    expect(TUNES.run.form.some((s) => s.synth)).toBe(true);
    expect(TUNES.run.form.some((s) => !s.synth)).toBe(true);
    expect(TUNES.menu.form.some((s) => s.synth)).toBe(false);
  });

  it("arpeggiates the chord an octave up, on the eighths only", () => {
    const voicing = [58, 62, 65, 69];
    const notes = Array.from({ length: 16 }, (_, i) => arpNote(voicing, i));
    for (const [i, note] of notes.entries()) {
      if (i % 2) expect(note).toBeNull();
      else expect(voicing.map((n) => n + 12)).toContain(note);
    }
  });
});
