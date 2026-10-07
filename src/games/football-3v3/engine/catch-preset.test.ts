import { describe, expect, it } from "vitest";
import { CATCH_AFTER, CATCH_KINDS, CATCH_PICK, catchKindFor, type CatchRead } from "./catch-preset";
import { noteCatch } from "./catch/plan";
import type { Match } from "./match";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import type { Athlete } from "./types";

const soft: CatchRead = { height: 1.3, speed: 15, facing: 1, contest: 6, short: 0, play: "catch" };

/** Throws a pass to the receiver standing `dx` metres downfield and `dz` across, steps until the ball is his or gone. */
function passTo(dx: number, dz: number): { m: Match; wr: Athlete; kinds: string[] } {
  const m = peopleMatch();
  snap(m);
  const qb = bySeat(m, 0);
  const wr = bySeat(m, 1);
  const d = bySeat(m, 3);
  wr.x = qb.x + dx * m.sign;
  wr.z = qb.z + dz;
  d.x = qb.x + 40 * m.sign;
  m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
  m.setAim(qb.id, null);
  const kinds: string[] = [];
  run(m, 3, (mm) => {
    if (wr.catching && !kinds.includes(wr.catching.kind)) kinds.push(wr.catching.kind);
    return mm.ball.state !== "pass" && mm.ball.state !== "held" ? true : mm.carrier() === wr;
  });
  return { m, wr, kinds };
}

describe("catch presets", () => {
  it("picks the move from the ball's height, speed, angle and the coverage", () => {
    expect(catchKindFor(soft)).toBe("chest");
    expect(catchKindFor({ ...soft, height: CATCH_PICK.high + 0.2 })).toBe("high");
    expect(catchKindFor({ ...soft, height: 0.4 })).toBe("dive");
    expect(catchKindFor({ ...soft, short: 1 })).toBe("dive");
    expect(catchKindFor({ ...soft, facing: -0.8 })).toBe("shoulder");
    expect(catchKindFor({ ...soft, contest: 0.6 })).toBe("stumble");
    expect(catchKindFor({ ...soft, speed: CATCH_PICK.hot + 3 })).toBe("stumble");
    expect(catchKindFor({ ...soft, play: "pick" })).toBe("pick");
    expect(catchKindFor({ ...soft, play: "swat" })).toBe("swat");
  });

  it("keeps every move short enough to be running again before the play moves on", () => {
    for (const k of CATCH_KINDS) expect(CATCH_AFTER[k]).toBeLessThan(0.8);
  });

  it("gives the receiver his move before the ball gets there, and finishes it with the result", () => {
    const { m, wr, kinds } = passTo(9, 2);
    expect(kinds.length).toBeGreaterThan(0);
    expect(m.carrier()).toBe(wr);
    expect(wr.catching?.result).toBe("held");
    // The move was picked ahead of the ball: the hands were ready, not caught by surprise.
    expect(wr.catching!.t).toBeGreaterThan(0.2);
    // It lets go of him once it has played out.
    run(m, 1);
    expect(wr.catching).toBeNull();
  });

  it("lays out for a ball led past where he can run, leaving the ground before it arrives", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    wr.x = qb.x + 9 * m.sign;
    wr.z = qb.z;
    bySeat(m, 3).x = qb.x + 40 * m.sign;
    m.setAim(qb.id, { x: 9 * m.sign, z: 0 });
    m.setAim(qb.id, null);
    // He is knocked off his spot just after the ball goes, so it is led well past him.
    run(m, 0.3, () => m.ball.state === "pass");
    wr.z += 2.5;
    let leftEarly = false;
    run(m, 2.5, () => {
      const p = wr.catching;
      if (p?.kind === "dive" && wr.action.kind === "dive" && !p.result && p.at - p.t > 0.05) leftEarly = true;
      return m.ball.state !== "pass";
    });
    expect(wr.catching?.kind).toBe("dive");
    expect(leftEarly).toBe(true);
  });

  it("calls a drop with a defender on him a hit that jarred it loose, and staggers him", () => {
    const m = peopleMatch();
    snap(m);
    const wr = bySeat(m, 1);
    const d = bySeat(m, 3);
    d.x = wr.x + 0.4;
    d.z = wr.z;
    noteCatch(m, wr, "dropped", "catch");
    expect(wr.catching?.result).toBe("jarred");
    expect(wr.stagger).toBeGreaterThan(0.5);
    expect(wr.stumble).not.toBeNull();
  });

  it("gives a defender who gets a hand to it the swat or the pick", () => {
    const m = peopleMatch();
    snap(m);
    const d = bySeat(m, 3);
    noteCatch(m, d, "swatted", "swat");
    expect(d.catching).toMatchObject({ kind: "swat", result: "swatted" });
    const e = bySeat(m, 2);
    noteCatch(m, e, "held", "pick");
    expect(e.catching).toMatchObject({ kind: "pick", result: "held" });
  });
});
