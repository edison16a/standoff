import { describe, expect, it } from "vitest";
import type { PlayEnd } from "../engine/events";
import { whistleFor } from "./whistle-call";

describe("the officials' whistle", () => {
  it("blows only for a score", () => {
    for (const end of ["touchdown", "safety", "fieldGoal"] as PlayEnd[]) expect(whistleFor(end)).toBe("score");
  });

  it("stays quiet when a play is simply over", () => {
    for (const end of ["tackle", "sack", "out", "incomplete", "touchback", "dive", "missedKick", "punt"] as PlayEnd[]) expect(whistleFor(end)).toBeNull();
  });
});
