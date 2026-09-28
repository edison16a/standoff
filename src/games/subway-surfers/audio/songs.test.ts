import { describe, expect, it } from "vitest";
import { TUNES } from "./music";
import { bars, heldFor, note } from "./score";

describe("subway songs", () => {
  it("loops each song on sixteen whole bars", () => {
    for (const song of Object.values(TUNES)) expect(song.steps).toBe(16 * 16);
  });

  it("runs the disco faster than the lounge tune", () => {
    expect(TUNES.run.bpm).toBeGreaterThan(TUNES.menu.bpm);
  });

  it("reads a bar of text into a chord and eight steps", () => {
    const [bar] = bars({ Am: "A1 C4 E4" }, [["Am", "E5 . . G5 . . . ."]]);
    expect(bar!.chord).toEqual([note("A1"), 60, 64]);
    expect(bar!.melody).toHaveLength(8);
    expect(heldFor(bar!.melody, 0)).toBe(3);
    expect(heldFor(bar!.melody, 3)).toBe(5);
  });
});
