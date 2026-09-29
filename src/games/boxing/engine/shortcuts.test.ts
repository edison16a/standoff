import { describe, expect, it } from "vitest";
import { stopFight } from "./shortcuts";
import { fighting, ofType } from "./test-helpers";

describe("stopFight", () => {
  it("ends the fight at once with a stoppage for the winner", () => {
    const match = fighting();
    expect(stopFight(match, 1)).toBe(true);
    expect(match.phase).toBe("over");
    expect(match.result).toMatchObject({ winner: 1, method: "TKO", round: 1 });
    expect(ofType(match.update(10), "over")).toHaveLength(1);
  });

  it("does nothing once the fight is over", () => {
    const match = fighting();
    stopFight(match, 0);
    expect(stopFight(match, 1)).toBe(false);
    expect(match.result?.winner).toBe(0);
  });
});
