import { describe, expect, it } from "vitest";
import { buildLineup, lineupProblem } from "./lineup";

describe("lineup", () => {
  it("fills two teams around two people", () => {
    const entries = buildLineup([
      { seat: 0, team: 0, character: "reed" },
      { seat: 1, team: 1, character: "banks" },
    ]);
    expect(lineupProblem(entries)).toBeNull();
    expect(entries).toHaveLength(6);
    expect(entries.filter((e) => e.seat !== null && e.role === "qb")).toHaveLength(2);
    // Computer runners never copy a teammate's pick.
    const team0 = entries.filter((e) => e.team === 0).map((e) => e.character);
    expect(new Set(team0).size).toBe(3);
  });

  it("lets the person who asked play QB", () => {
    const entries = buildLineup([
      { seat: 0, team: 0, character: "reed" },
      { seat: 2, team: 0, character: "lindqvist", qb: true },
      { seat: 1, team: 1, character: "banks" },
    ]);
    expect(entries.find((e) => e.team === 0 && e.role === "qb")?.seat).toBe(2);
    expect(entries.find((e) => e.seat === 0)?.role).toBe("runner");
  });

  it("can play with fewer runners", () => {
    const entries = buildLineup([{ seat: 0, team: 0, character: "reed" }, { seat: 1, team: 1, character: "ortiz" }], 0);
    expect(entries).toHaveLength(2);
    expect(lineupProblem(entries)).toBeNull();
  });

  it("rejects a team without a QB or a computer QB over a person", () => {
    expect(lineupProblem([{ team: 0, role: "runner", character: "reed", seat: 0 }, { team: 1, role: "qb", character: "banks", seat: 1 }])).toMatch(/QB/);
    expect(lineupProblem([
      { team: 0, role: "qb", character: "reed", seat: null },
      { team: 0, role: "runner", character: "ortiz", seat: 0 },
      { team: 1, role: "qb", character: "banks", seat: 1 },
    ])).toMatch(/person/);
  });
});
