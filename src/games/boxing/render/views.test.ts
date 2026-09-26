import { describe, expect, it } from "vitest";
import { FULL, LEFT, ownViews, RIGHT } from "./views";

describe("ownViews", () => {
  it("splits the screen down the middle for two players during the rounds", () => {
    for (const phase of ["touch", "fight", "knockdown", "stoppage"] as const) {
      expect(ownViews("fight", phase, [true, true])).toEqual([
        { id: 0, rect: LEFT },
        { id: 1, rect: RIGHT },
      ]);
    }
  });

  it("gives one player the whole screen", () => {
    expect(ownViews("fight", "fight", [true, false])).toEqual([{ id: 0, rect: FULL }]);
  });

  it("hands the screen to the broadcast camera for the walk out, the breaks and the end", () => {
    // The overlay used to keep two halves of bars and the line between them over this one wide picture.
    for (const phase of ["intro", "break", "over"] as const) expect(ownViews("fight", phase, [true, true])).toEqual([]);
    for (const shot of ["menu", "replay", "celebrate"] as const) expect(ownViews(shot, "fight", [true, true])).toEqual([]);
    expect(ownViews("fight", "fight", [false, false])).toEqual([]);
  });
});
