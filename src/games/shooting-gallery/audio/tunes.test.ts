import { describe, expect, it } from "vitest";
import { BOARDWALK } from "./boardwalk";
import { MIDWAY } from "./midway";
import { bars, heldFor, note } from "./score";

describe("tunes", () => {
  it("reads note names and bars", () => {
    expect(note("C4")).toBe(60);
    expect(note("Bb4")).toBe(70);
    expect(note("F#5")).toBe(78);
    const [bar] = bars({ F: "F2 A3 C4" }, [["F", "C5 . F5 . . . A5 ."]]);
    expect(bar!.chord).toEqual([41, 57, 60]);
    expect(heldFor(bar!.melody, 2)).toBe(4);
    expect(() => bars({ F: "F2" }, [["F", "C5 ."]])).toThrow();
  });

  it("gives both tunes sixteen bars of eighths, so the A and B sections loop cleanly", () => {
    for (const track of [BOARDWALK, MIDWAY]) expect(track.length).toBe(16 * 8);
    // Different tempos, so the lobby and the round never sound like the same song.
    expect(BOARDWALK.step).toBeGreaterThan(MIDWAY.step);
  });
});
