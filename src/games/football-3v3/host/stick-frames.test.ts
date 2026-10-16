import { describe, expect, it } from "vitest";
import { StickFrames } from "./stick-frames";

const UP = { x: 1, z: 0 };
const TURNED = { x: -1, z: 0 };
const PANNED = { x: Math.cos(0.4), z: Math.sin(0.4) };

describe("a stick read against the camera", () => {
  it("follows the camera while nothing is held", () => {
    const f = new StickFrames();
    expect(f.frame(0, { x: 0, y: 0 }, UP)).toEqual(UP);
    expect(f.frame(0, { x: 0, y: 0 }, TURNED)).toEqual(TURNED);
  });

  it("follows an ordinary pan under a held stick", () => {
    const f = new StickFrames();
    f.frame(0, { x: 0, y: 1 }, UP);
    expect(f.frame(0, { x: 0, y: 1 }, PANNED)).toEqual(PANNED);
  });

  it("keeps the old view through a turn round until the thumb lets go", () => {
    const f = new StickFrames();
    f.frame(0, { x: 0, y: 1 }, UP);
    // After a turnover the camera swings round: the held thumb still means the same way on the field.
    expect(f.frame(0, { x: 0, y: 1 }, TURNED)).toEqual(UP);
    expect(f.frame(0, { x: 0, y: 0 }, TURNED)).toEqual(TURNED);
    expect(f.frame(0, { x: 0, y: 1 }, TURNED)).toEqual(TURNED);
  });

  it("keeps each phone's view apart", () => {
    const f = new StickFrames();
    f.frame(0, { x: 0, y: 1 }, UP);
    expect(f.frame(1, { x: 0, y: 1 }, TURNED)).toEqual(TURNED);
    expect(f.frame(0, { x: 0, y: 1 }, TURNED)).toEqual(UP);
  });
});
