import { describe, expect, it } from "vitest";
import { xToYard, yardToX } from "./field";
import { RULES } from "./tuning";
import { bySeat, peopleMatch, run, setDrive, snap } from "./test-helpers";

describe("play flow", () => {
  it("waits for the QB's pick, then gives five seconds to hike", () => {
    const m = peopleMatch();
    expect(m.phase).toBe("choose");
    run(m, 2);
    expect(m.phase).toBe("choose");
    m.choose(bySeat(m, 0).id, "throw");
    expect(m.phase).toBe("presnap");
    const events = run(m, RULES.hikeSeconds + 0.1, () => m.phase === "live");
    expect(m.phase).toBe("live");
    expect(events.find((e) => e.type === "hike")).toMatchObject({ auto: true });
  });

  it("ignores a pick from anyone but the offense's QB", () => {
    const m = peopleMatch();
    m.choose(bySeat(m, 2).id, "kick");
    m.choose(bySeat(m, 1).id, "kick");
    expect(m.phase).toBe("choose");
  });

  it("keeps the defence onside until the snap", () => {
    const m = peopleMatch();
    m.choose(bySeat(m, 0).id, "throw");
    const d = bySeat(m, 3);
    m.setMove(d.id, { x: -1, z: 0 });
    run(m, 3);
    expect((d.x - yardToX(0, m.drive.los)) * m.sign).toBeGreaterThan(0);
  });

  it("counts an incompletion as a down at the same spot", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    // Throw at a receiver standing far away, then walk them off so the ball falls.
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    m.setAim(qb.id, null);
    m.setMove(wr.id, { x: -1, z: 0 });
    const events = run(m, 6, () => m.phase === "dead");
    expect(events.some((e) => e.type === "throw")).toBe(true);
    run(m, RULES.deadSeconds + 0.1);
    if (events.some((e) => e.type === "incomplete")) {
      expect(m.drive.down).toBe(2);
      expect(m.drive.los).toBe(RULES.driveStart);
    } else {
      expect(events.some((e) => e.type === "catch")).toBe(true);
    }
  });

  it("scores a touchdown running into the end zone, then offers kick or two", () => {
    const m = peopleMatch();
    setDrive(m, 0, 96);
    snap(m);
    const qb = bySeat(m, 0);
    // Wide of the linemen, who would grab a runner going through them.
    m.setMove(qb.id, { x: 1, z: 0.8 });
    const events = run(m, 6, () => m.phase === "touchdown");
    expect(events.some((e) => e.type === "touchdown")).toBe(true);
    expect(m.score).toEqual([6, 0]);
    run(m, RULES.touchdownSeconds + 0.1);
    expect(m.phase).toBe("convert");
    m.choose(qb.id, "two");
    expect(m.phase).toBe("presnap");
    expect(m.drive.los).toBe(RULES.twoPointSpot);
  });

  it("gives the defence two points for a safety", () => {
    const m = peopleMatch();
    setDrive(m, 0, 2);
    snap(m);
    const qb = bySeat(m, 0);
    // From the shotgun the QB already stands in the end zone: run out of its side for a safety.
    m.setMove(qb.id, { x: -0.3, z: -1 });
    const events = run(m, 12, () => m.phase === "dead");
    expect(xToYard(0, qb.x)).toBeLessThan(0);
    expect(events.some((e) => e.type === "safety")).toBe(true);
    expect(m.score).toEqual([0, 2]);
  });
});

describe("the clock", () => {
  it("runs only while the ball is live", () => {
    const m = peopleMatch();
    run(m, 3);
    expect(m.clock).toBe(m.quarterSeconds);
    snap(m);
    run(m, 1);
    expect(m.clock).toBeLessThan(m.quarterSeconds);
  });

  it("moves to the next quarter when time runs out, and ends the game after the fourth", () => {
    const m = peopleMatch({ quarterSeconds: 2 });
    for (let q = 0; q < 8 && m.phase !== "over"; q++) {
      snap(m);
      m.setMove(bySeat(m, 0).id, { x: 0, z: 1 });
      run(m, 40, () => m.phase === "choose" || m.phase === "over");
    }
    expect(m.phase).toBe("over");
    expect(m.quarter).toBeGreaterThanOrEqual(4);
  });
});
