import { describe, expect, it } from "vitest";
import { CEREMONY } from "../engine/ceremony";
import { createMatch, type Entrant } from "../engine/match";
import { fullTime } from "../engine/rules";
import { ceremonyCard } from "./ceremony-card";

const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: 3 },
  { team: 0, build: "playmaker", seat: null },
  { team: 0, build: "winger", seat: 1 },
  { team: 1, build: "defender", seat: 2 },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "allrounder", seat: null },
];
const NAMES = new Map([
  [1, "Maya"],
  [2, "Theo"],
  [3, "Edison"],
]);

function finished(winner: 0 | 1, seconds: number) {
  const match = createMatch(LINEUP, { seed: 1 });
  match.score = winner === 0 ? [4, 2] : [1, 3];
  fullTime(match);
  match.phaseT = seconds;
  return match;
}

describe("the ceremony card", () => {
  it("waits for the cut to the ceremony", () => {
    expect(ceremonyCard(finished(0, CEREMONY.cut - 0.1), NAMES)).toBeNull();
  });

  it("names the winners' own players, top scorer first, and the score", () => {
    const match = finished(0, CEREMONY.cut + CEREMONY.up + 0.5);
    match.athletes[2]!.stats.goals = 3;
    const card = ceremonyCard(match, NAMES)!;
    expect(card.stage).toBe("raised");
    expect(card.names.map((n) => n.name)).toEqual(["Maya", "Edison"]);
    expect(card.subtitle).toBe("Red win 4 to 2");
    expect(card.eyebrow).toBe("Champions");
  });

  it("names a side of computers only by its colour", () => {
    const match = finished(1, CEREMONY.cut + 1);
    match.athletes[3]!.seat = null;
    const card = ceremonyCard(match, NAMES)!;
    expect(card.stage).toBe("cup");
    expect(card.names).toEqual([{ name: "Blue", colour: expect.any(String) }]);
    expect(card.subtitle).toBe("Blue win 3 to 1");
  });

  it("brings the stats in at the end, and says so for a golden goal", () => {
    const match = finished(1, CEREMONY.cut + CEREMONY.stats);
    match.golden = true;
    const card = ceremonyCard(match, NAMES)!;
    expect(card.stage).toBe("stats");
    expect(card.eyebrow).toBe("Golden goal champions");
  });
});
