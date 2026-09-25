import { describe, expect, it } from "vitest";
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
});
