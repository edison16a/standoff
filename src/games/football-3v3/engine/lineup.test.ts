import { describe, expect, it } from "vitest";
import { buildLineup, type Entrant } from "./lineup";

const human = (team: 0 | 1, seat: number, role: Entrant["role"] = "runner", character: Entrant["character"] = "jet"): Entrant => ({ team, seat, role, character });

describe("the line up", () => {
  it("fills both sides to a quarterback and two runners", () => {
    const lineup = buildLineup([human(0, 0), human(1, 1, "runner", "tank")]);
    expect(lineup).toHaveLength(6);
    for (const team of [0, 1]) {
      const side = lineup.filter((e) => e.team === team);
      expect(side.filter((e) => e.role === "qb")).toHaveLength(1);
      expect(side.filter((e) => e.role === "runner")).toHaveLength(2);
      expect(side[0]!.role).toBe("qb");
    }
  });

  it("puts a human at quarterback when the side has one", () => {
    const lineup = buildLineup([human(0, 0, "runner"), human(0, 1, "runner", "bolt")]);
    expect(lineup[0]).toMatchObject({ seat: 0, role: "qb" });
    expect(lineup[1]).toMatchObject({ seat: 1, role: "runner" });
  });

  it("keeps the host's quarterback pick", () => {
    const lineup = buildLineup([human(1, 0, "runner"), human(1, 3, "qb", "ace")]);
    const blue = lineup.filter((e) => e.team === 1);
    expect(blue[0]).toMatchObject({ seat: 3, role: "qb" });
  });

  it("dresses computer players in characters nobody picked", () => {
    const lineup = buildLineup([human(0, 0, "qb", "blaze"), human(1, 1, "qb", "jet")]);
    const bots = lineup.filter((e) => e.seat === null).map((e) => e.character);
    expect(bots).not.toContain("blaze");
    expect(bots).not.toContain("jet");
    expect(new Set(bots).size).toBe(bots.length);
  });

  it("can leave the runners empty", () => {
    expect(buildLineup([human(0, 0), human(1, 1)], false)).toHaveLength(2);
  });
});
