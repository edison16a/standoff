import { describe, expect, it } from "vitest";
import { ropesInTheWay, ROPE_INSET } from "./ropes";

describe("ropesInTheWay", () => {
  it("keeps every rope for a camera inside the ring, like a player's own view", () => {
    expect(ropesInTheWay({ x: 2.55, y: 1.95, z: -2.55 })).toEqual([false, false, false, false]);
    expect(ropesInTheWay({ x: 0, y: 1.4, z: 0 })).toEqual([false, false, false, false]);
  });

  it("leaves out only the near side for a low camera just outside the ropes", () => {
    // The showcase's opening shot sat here, with the top rope drawn as a bar across both boxers.
    expect(ropesInTheWay({ x: 0.2, y: 1.5, z: ROPE_INSET + 0.15 })).toEqual([true, false, false, false]);
    expect(ropesInTheWay({ x: ROPE_INSET + 0.8, y: 1.3, z: 0.4 })).toEqual([false, true, false, false]);
    expect(ropesInTheWay({ x: -0.5, y: 1.2, z: -(ROPE_INSET + 0.5) })).toEqual([false, false, true, false]);
  });

  it("keeps the ropes for wide shots from far back or high above", () => {
    expect(ropesInTheWay({ x: 0, y: 2.0, z: ROPE_INSET + 4 })).toEqual([false, false, false, false]);
    expect(ropesInTheWay({ x: ROPE_INSET + 0.5, y: 3.2, z: 0 })).toEqual([false, false, false, false]);
  });

  it("clears both sides for a camera out past a corner", () => {
    expect(ropesInTheWay({ x: ROPE_INSET + 0.4, y: 1.4, z: ROPE_INSET + 0.4 })).toEqual([true, true, false, false]);
  });
});
