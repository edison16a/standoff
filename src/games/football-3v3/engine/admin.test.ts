import { describe, expect, it } from "vitest";
import { adminFieldGoal, adminTouchdown, adminTwoPoint } from "./admin";
import { RULES } from "./tuning";
import { peopleMatch, run } from "./test-helpers";

describe("admin shortcuts", () => {
  it("scores a touchdown and moves on to the try", () => {
    const m = peopleMatch();
    adminTouchdown(m, 1);
    expect(m.score).toEqual([0, 6]);
    expect(m.phase).toBe("touchdown");
    run(m, RULES.touchdownSeconds + 0.1);
    expect(m.phase).toBe("convert");
    expect(m.offense).toBe(1);
  });

  it("sets up a field goal at the meters", () => {
    const m = peopleMatch();
    adminFieldGoal(m, 0);
    expect(m.phase).toBe("kick");
    expect(m.kick?.fieldGoal).toBe(true);
    expect(m.kick?.stage).toBe("aim");
  });

  it("sets up a two point try", () => {
    const m = peopleMatch();
    adminTwoPoint(m, 1);
    expect(m.phase).toBe("presnap");
    expect(m.drive.conversion).toBe(true);
    expect(m.drive.los).toBe(RULES.twoPointSpot);
    expect(m.offense).toBe(1);
  });
});
