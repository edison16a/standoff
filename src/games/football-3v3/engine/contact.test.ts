import { describe, expect, it } from "vitest";
import { topSpeed } from "./athlete";
import { jukeFor } from "./juke";
import { breakChance } from "./tackle";
import { bySeat, cmd, game, place, run, snapped } from "./test-kit";
import { TACKLE } from "./tuning";
import type { MatchState } from "./types";
import { v2 } from "./vec";

/** Hands the ball to a runner as if he had caught it. */
function giveBall(s: MatchState, id: number): void {
  s.play.carrier = id;
  s.play.thrown = true;
  s.ball.mode = "held";
  s.ball.holder = id;
}

describe("jukes", () => {
  it("pick the move from the stick against the run", () => {
    const run = v2(1, 0);
    expect(jukeFor(run, v2()).kind).toBe("spin");
    expect(jukeFor(run, v2(1, 0)).kind).toBe("spin");
    expect(jukeFor(run, v2(-1, 0)).kind).toBe("back");
    expect(jukeFor(run, v2(0, 1))).toEqual({ kind: "side", side: 1 });
    expect(jukeFor(run, v2(0, -1))).toEqual({ kind: "side", side: -1 });
  });

  it("slow the moves and the running when spammed", () => {
    const s = snapped(game());
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    const fresh = topSpeed(s, r);
    let jukes = 0;
    for (let i = 0; i < 16; i++) jukes += run(s, 0.5, cmd(r.id, { move: v2(1, 0), juke: true })).filter((e) => e.type === "juke").length;
    // The cooldown grows with every juke, so a mashed button gets far fewer than one each half second.
    expect(jukes).toBeLessThan(9);
    expect(r.juke.heat).toBeGreaterThan(1.5);
    expect(topSpeed(s, r)).toBeLessThan(fresh);
  });
});

describe("tackles", () => {
  it("lunge only when the carrier is close", () => {
    const s = snapped(game());
    const d = bySeat(s, 3);
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    place(r, 0, 0);
    place(d, 6, 0);
    expect(run(s, 0.1, cmd(d.id, { tackle: true })).some((e) => e.type === "lunge")).toBe(false);
    place(d, 2, 0);
    d.tackleWait = 0;
    expect(run(s, 1 / 60, cmd(d.id, { tackle: true })).some((e) => e.type === "lunge")).toBe(true);
  });

  it("bring the carrier down and end the play", () => {
    const s = snapped(game());
    const d = bySeat(s, 3);
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    place(r, s.drive.los + 6, 0);
    place(d, s.drive.los + 8, 0);
    const events = run(s, 0.8, cmd(d.id, { tackle: true }));
    expect(events.find((e) => e.type === "tackle")).toMatchObject({ athlete: d.id, carrier: r.id, result: "made" });
    expect(events.some((e) => e.type === "whistle")).toBe(true);
    expect(d.stats.tackles).toBe(1);
  });

  it("whiff against a juke, leaving the tackler on the grass", () => {
    const s = snapped(game());
    const d = bySeat(s, 3);
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    place(r, s.drive.los + 6, 0, 6, 0);
    place(d, s.drive.los + 9.5, 0);
    const events = run(s, 0.6, (t) => new Map([[r.id, { move: v2(0, 1), juke: t < 0.05 }], [d.id, { move: v2(), tackle: t > 0.1 }]]));
    expect(events.find((e) => e.type === "tackle")).toMatchObject({ athlete: d.id, result: "missed" });
    expect(d.action).toBe("down");
    expect(d.downKind).toBe("missed");
    expect(s.play.end).toBeNull();
    // Still down a while later: the whiff costs real time.
    run(s, TACKLE.missDown * 0.6, new Map([[r.id, { move: v2(1, 0) }]]));
    expect(d.action).toBe("down");
  });

  it("count a quarterback brought down behind the line as a sack", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const d = bySeat(s, 3);
    place(qb, s.drive.los - 6, 0);
    place(d, s.drive.los - 4, 0);
    const events = run(s, 0.8, cmd(d.id, { tackle: true }));
    expect(events.some((e) => e.type === "sack" && e.qb === qb.id)).toBe(true);
    expect(d.stats.sacks).toBe(1);
  });

  it("are broken more by strong carriers than weak ones", () => {
    const s = game();
    const [weak, strong] = [s.athletes.find((a) => a.character === "jet")!, s.athletes.find((a) => a.character === "tank")!];
    expect(breakChance(weak, strong)).toBeGreaterThan(breakChance(strong, weak));
  });
});
