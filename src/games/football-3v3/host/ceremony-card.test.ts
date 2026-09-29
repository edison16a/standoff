import { describe, expect, it } from "vitest";
import { adminWin } from "../engine/admin";
import { CEREMONY } from "../engine/ceremony";
import { peopleMatch, run } from "../engine/test-helpers";
import { ceremonyCard } from "./ceremony-card";

const NAMES = new Map([
  [0, "Ava"],
  [1, "Ben"],
  [2, "Cal"],
  [3, "Dee"],
]);

describe("the presentation card", () => {
  it("waits for the cut, then names the winners by their own names, the captain first", () => {
    const m = peopleMatch();
    const runner = m.bySeat(3)!;
    runner.stats.touchdowns = 2;
    adminWin(m, 1);
    expect(ceremonyCard(m, NAMES)).toBeNull();
    run(m, CEREMONY.cut + 0.5);
    const card = ceremonyCard(m, NAMES)!;
    expect(card.stage).toBe("trophy");
    expect(card.names.map((n) => n.name)).toEqual(["Dee", "Cal"]);
    expect(card.subtitle).toMatch(/^Blaze win \d+ to \d+$/);
  });

  it("moves from the trophy to the names to the stats on the clock", () => {
    const m = peopleMatch();
    adminWin(m, 0);
    run(m, CEREMONY.cut + CEREMONY.up + 0.2);
    expect(ceremonyCard(m, NAMES)!.stage).toBe("raised");
    run(m, CEREMONY.stats);
    expect(ceremonyCard(m, NAMES)!.stage).toBe("stats");
  });
});
