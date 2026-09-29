import { describe, expect, it } from "vitest";
import { BUILDS, type BuildId } from "../builds";
import { buildLineup, lineupProblem, takeSpare } from "./lineup";

describe("lineup", () => {
  it("fills two teams around two people", () => {
    const entries = buildLineup([
      { seat: 0, team: 0, build: "gunslinger" },
      { seat: 1, team: 1, build: "speedster" },
    ]);
    expect(lineupProblem(entries)).toBeNull();
    expect(entries).toHaveLength(6);
    expect(entries.filter((e) => e.seat !== null && e.role === "qb")).toHaveLength(2);
    // Computer runners never copy a teammate's pick.
    const team0 = entries.filter((e) => e.team === 0).map((e) => e.build);
    expect(new Set(team0).size).toBe(3);
  });

  it("lets the person who asked play QB", () => {
    const entries = buildLineup([
      { seat: 0, team: 0, build: "gunslinger" },
      { seat: 2, team: 0, build: "scrambler", qb: true },
      { seat: 1, team: 1, build: "speedster" },
    ]);
    expect(entries.find((e) => e.team === 0 && e.role === "qb")?.seat).toBe(2);
    expect(entries.find((e) => e.seat === 0)?.role).toBe("runner");
  });

  it("gives a computer QB a QB build and computer runners the others", () => {
    const entries = buildLineup([{ seat: 0, team: 0, build: "lockdown" }]);
    const cpuQb = entries.find((e) => e.team === 1 && e.role === "qb")!;
    expect(BUILDS[cpuQb.build].best).toBe("qb");
    // Runners skip QB builds while others are left.
    const spare: BuildId[] = ["gunslinger", "speedster", "scrambler"];
    expect(takeSpare(spare, "runner")).toBe("speedster");
    expect(takeSpare(spare, "runner")).toBe("gunslinger");
    expect(takeSpare(spare, "qb")).toBe("scrambler");
    expect(new Set(entries.map((e) => e.build)).size).toBe(6);
  });

  it("can play with fewer runners", () => {
    const entries = buildLineup([{ seat: 0, team: 0, build: "gunslinger" }, { seat: 1, team: 1, build: "routerunner" }], 0);
    expect(entries).toHaveLength(2);
    expect(lineupProblem(entries)).toBeNull();
  });

  it("rejects a team without a QB or a computer QB over a person", () => {
    expect(lineupProblem([{ team: 0, role: "runner", build: "gunslinger", seat: 0 }, { team: 1, role: "qb", build: "speedster", seat: 1 }])).toMatch(/QB/);
    expect(lineupProblem([
      { team: 0, role: "qb", build: "gunslinger", seat: null },
      { team: 0, role: "runner", build: "routerunner", seat: 0 },
      { team: 1, role: "qb", build: "speedster", seat: 1 },
    ])).toMatch(/person/);
  });
});
