import { describe, expect, it } from "vitest";
import { lastStand } from "./last-stand";
import { phrase } from "./phrase";
import { SAFEHOUSE } from "./safehouse";

describe("tunes", () => {
  it("runs sixteen bars or more before repeating, the safehouse slower than the run", () => {
    const run = lastStand(() => 0);
    for (const loop of [SAFEHOUSE, run]) expect(loop.steps / 16).toBeGreaterThanOrEqual(16);
    expect(SAFEHOUSE.bpm).toBeLessThan(run.bpm);
  });

  it("reads phrases by step", () => {
    expect(phrase([[8, 70, 4]]).get(8)).toEqual({ note: 70, length: 4 });
  });
});
