import { describe, expect, it } from "vitest";
import { YARD } from "./field";
import { seatStatus } from "./status";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { buildView } from "./view";
import { blendViews } from "./view-blend";

describe("the view", () => {
  it("draws the line of scrimmage and the first down line ten yards on", () => {
    const v = buildView(peopleMatch());
    expect(v.drive.text).toBe("1st and 10");
    expect(v.drive.firstDownX! - v.drive.losX).toBeCloseTo(10 * YARD);
    // Two people a side, three linemen and five support players each.
    expect(v.athletes).toHaveLength(20);
    expect(v.countdown).toBeGreaterThan(0);
  });

  it("marks the targeted receiver and the ball carrier", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    const v = buildView(m);
    expect(v.athletes[wr.id]!.targeted).toBe(true);
    expect(v.athletes[qb.id]!.hasBall).toBe(true);
  });

  it("keeps the ring on the receiver while the pass is in the air", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    m.setAim(qb.id, null);
    // Past the throwing motion, with the stick let go, the ball is still on its way.
    run(m, 1, () => m.ball.state === "pass" && qb.action.kind === "none");
    const v = buildView(m);
    expect(v.ball.state).toBe("pass");
    expect(v.athletes[wr.id]!.targeted).toBe(true);
  });

  it("shows the linemen locked up once the ball is snapped, and not before", () => {
    const m = peopleMatch();
    const linemen = (v: ReturnType<typeof buildView>) => v.athletes.filter((a) => a.role === "lineman");
    expect(linemen(buildView(m)).some((a) => a.blocked)).toBe(false);
    snap(m);
    run(m, 0.5);
    expect(linemen(buildView(m)).every((a) => a.blocked)).toBe(true);
  });

  it("blends two stills half way", () => {
    const m = peopleMatch();
    snap(m);
    m.setMove(bySeat(m, 0).id, { x: 0, z: 1 });
    const a = buildView(m);
    run(m, 0.5);
    const b = buildView(m);
    const mid = blendViews(a, b, 0.5);
    const id = bySeat(m, 0).id;
    expect(mid.athletes[id]!.z).toBeCloseTo((a.athletes[id]!.z + b.athletes[id]!.z) / 2);
  });
});

describe("phone status", () => {
  it("gives each phone the right controls through a play", () => {
    const m = peopleMatch();
    expect(seatStatus(m, 0)?.pad).toBe("choose");
    expect(seatStatus(m, 2)?.pad).toBe("defense");
    m.choose(bySeat(m, 0).id, "throw");
    expect(seatStatus(m, 0)?.pad).toBe("qb");
    expect(seatStatus(m, 0)?.hikeLeft).toBeGreaterThan(4);
    expect(seatStatus(m, 1)?.pad).toBe("runner");
    expect(seatStatus(m, 3)?.pad).toBe("defense");
    expect(seatStatus(m, 9)).toBeNull();
  });

  it("hands the kicker the meters", () => {
    const m = peopleMatch();
    m.choose(bySeat(m, 0).id, "kick");
    const s = seatStatus(m, 0);
    expect(s?.pad).toBe("kicker");
    expect(s?.meter?.stage).toBe("aim");
  });
});
