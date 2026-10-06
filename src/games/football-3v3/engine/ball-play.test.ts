import { describe, expect, it } from "vitest";
import { createAthlete } from "./body";
import { bobble, swat } from "./catch/deflect";
import { POSTS, FIELD, xToYard } from "./field";
import { launch, stepFlight } from "./flight";
import { popBall } from "./fumble";
import { judgeFieldGoal } from "./kick-flight";
import { Rng } from "./rng";
import { bySeat, peopleMatch, run, setDrive, snap } from "./test-helpers";
import { RULES } from "./tuning";

describe("a ball off the hands", () => {
  const wr = createAthlete(0, 0, "runner", 0, "routerunner", null);

  it("pops up soft and spinning off hands that could not hold it", () => {
    const f = launch({ x: 0, y: 1.3, z: 0 }, { x: 16, y: -2, z: 0 }, "spiral", 60, 0.03);
    bobble(f, wr, { x: 0.3, y: 1.3, z: 0 }, new Rng(2));
    expect(f.vel.y).toBeGreaterThan(0);
    expect(Math.abs(f.vel.x)).toBeLessThan(10);
  });

  it("is slapped down and away by a swat", () => {
    const f = launch({ x: 0, y: 1.8, z: 0 }, { x: 16, y: 0, z: 0 }, "spiral", 60, 0.03);
    swat(f, wr, { x: 0.3, y: 1.8, z: 0 }, new Rng(2));
    expect(f.vel.y).toBeLessThan(-3);
  });
});

describe("kicks and the posts", () => {
  it("calls a kick off the upright that bounces back out no good", () => {
    const f = launch({ x: POSTS.x - 20, y: 1, z: POSTS.halfGap }, { x: 20, y: 9.2, z: 0 }, "tumble", 24, 0);
    let verdict: string | null = null;
    for (let i = 0; i < 400 && !verdict; i++) {
      stepFlight(f, 1 / 60);
      verdict = judgeFieldGoal(f, 1);
    }
    expect(f.goal?.kind).toBe("upright");
    expect(verdict).toBe("miss");
  });

  it("keeps the ball flying after a good kick, into the net, and down to the turf", () => {
    const m = peopleMatch();
    setDrive(m, 0, 80, 4);
    const qb = bySeat(m, 0);
    m.choose(qb.id, "kick");
    m.press(qb.id, "kick", 0);
    m.press(qb.id, "kick", 0.95);
    const events = run(m, 8, () => m.phase === "dead");
    expect(events.find((e) => e.type === "fieldGoal")).toMatchObject({ good: true });
    run(m, RULES.deadSeconds - 0.2);
    const f = m.ball.flight!;
    expect(f.goal?.kind).toBe("net");
    expect(m.ball.pos.x).toBeGreaterThan(POSTS.x);
    expect(m.ball.pos.y).toBeLessThan(3);
  });
});

describe("a fumble", () => {
  it("is a live ball: the first man to it scoops it up and runs", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const d = bySeat(m, 3);
    popBall(m, qb, { x: m.sign, z: 0 });
    expect(m.ball.state).toBe("loose");
    // The defender stands where it comes down.
    const events = run(m, 3, () => m.carrier() !== null || m.phase !== "live");
    if (m.carrier() === null) {
      d.x = m.ball.pos.x;
      d.z = m.ball.pos.z;
      events.push(...run(m, 0.5, () => m.carrier() !== null));
    }
    expect(events.some((e) => e.type === "fumble")).toBe(true);
    expect(m.carrier()).not.toBeNull();
    expect(m.phase).toBe("live");
  });

  it("is blown dead where it goes out, for the side that had it", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const los = m.drive.los;
    // Knocked hard toward the sideline from near it.
    qb.z = FIELD.halfWidth - 1;
    qb.vx = 0;
    qb.vz = 6;
    popBall(m, qb, { x: 0, z: 1 });
    for (const a of m.athletes) if (a.role !== "lineman") a.x = 40;
    const events = run(m, 4, () => m.phase !== "live");
    expect(events.find((e) => e.type === "whistle")).toMatchObject({ end: "out" });
    run(m, RULES.deadSeconds + 0.1);
    expect(m.drive.offense).toBe(0);
    expect(m.drive.los).toBeCloseTo(Math.round(xToYard(0, m.ball.pos.x)), -1);
    expect(m.drive.down).toBe(2);
    expect(Math.abs(m.drive.los - los)).toBeLessThan(10);
  });
});
