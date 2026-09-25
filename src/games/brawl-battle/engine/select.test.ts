import { describe, expect, it } from "vitest";
import { PadInput } from "./input";
import { directionOf, selectMove, turnFor } from "./select";

describe("reading the stick", () => {
  it("names the four directions and a neutral middle", () => {
    expect(directionOf(0, 0)).toBe("neutral");
    expect(directionOf(0.2, -0.2)).toBe("neutral");
    expect(directionOf(1, 0)).toBe("side");
    expect(directionOf(-0.8, 0.3)).toBe("side");
    expect(directionOf(0, 1)).toBe("up");
    expect(directionOf(0.3, -0.9)).toBe("down");
  });

  it("gives a diagonal to side unless up or down clearly leads", () => {
    expect(directionOf(0.7, 0.7)).toBe("side");
    expect(directionOf(0.5, 0.8)).toBe("up");
  });
});

describe("choosing a move", () => {
  it("picks a ground variant of Attack 1 for each direction", () => {
    expect(selectMove("light", 0, 0, true)).toBe("jab");
    expect(selectMove("light", -1, 0, true)).toBe("side");
    expect(selectMove("light", 0, 1, true)).toBe("up");
    expect(selectMove("light", 0, -1, true)).toBe("down");
  });

  it("picks aerials in the air", () => {
    expect(selectMove("light", 0, 0, false)).toBe("air");
    expect(selectMove("light", 1, 0, false)).toBe("air");
    expect(selectMove("light", 0, 1, false)).toBe("airUp");
    expect(selectMove("light", 0, -1, false)).toBe("airDown");
  });

  it("picks Attack 2 variants the same on the ground and in the air", () => {
    for (const grounded of [true, false]) {
      expect(selectMove("heavy", 0, 0, grounded)).toBe("heavy");
      expect(selectMove("heavy", 1, 0, grounded)).toBe("heavySide");
      expect(selectMove("heavy", 0, 1, grounded)).toBe("heavyUp");
      expect(selectMove("heavy", 0, -1, grounded)).toBe("heavyDown");
      expect(selectMove("ult", 1, 1, grounded)).toBe("ult");
    }
  });

  it("turns toward a side attack but keeps facing for aerials", () => {
    expect(turnFor("side", -1, true)).toBe(-1);
    expect(turnFor("heavySide", 1, false)).toBe(1);
    expect(turnFor("air", -1, false)).toBeNull();
    expect(turnFor("jab", 0, true)).toBeNull();
  });
});

describe("the pad", () => {
  it("jumps once as the stick goes up, and again only after it comes back down", () => {
    const pad = new PadInput();
    expect(pad.read(0, 1).jump).toBe(true);
    expect(pad.read(0, 1).jump).toBeUndefined();
    expect(pad.read(0, 0.5).jump).toBeUndefined();
    pad.read(0, 0);
    expect(pad.read(0, 0.9).jump).toBe(true);
  });

  it("keeps a tap made between steps for exactly one step", () => {
    const pad = new PadInput();
    pad.press("light");
    pad.press("ult");
    const first = pad.read(0.4, 0);
    expect(first.light).toBe(true);
    expect(first.ult).toBe(true);
    expect(pad.read(0, 0).light).toBeUndefined();
  });

  it("cleans up bad stick values", () => {
    const pad = new PadInput();
    expect(pad.read(Number.NaN, 3)).toMatchObject({ x: 0, y: 1 });
  });
});
