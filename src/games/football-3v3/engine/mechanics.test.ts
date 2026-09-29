import { describe, expect, it } from "vitest";
import { seatControls } from "./controls";
import { newDrive } from "./downs";
import { xFromGoal } from "./field";
import { beginCall } from "./flow";
import { setOnline } from "./index";
import { DEFAULT_OPTIONS } from "./match";
import { bySeat, cmd, game, place, run, snapped } from "./test-kit";
import type { MatchState } from "./types";
import { viewOf } from "./view";
import { dist, v2 } from "./vec";

function giveBall(s: MatchState, id: number): void {
  s.play.carrier = id;
  s.play.thrown = true;
  s.ball.mode = "held";
  s.ball.holder = id;
}

describe("the line", () => {
  it("rams together at the snap and fights near the line of scrimmage", () => {
    const s = game("easy");
    run(s, 0.1, cmd(0, { call: "throw" }));
    const events = run(s, 0.1, cmd(0, { hike: true }));
    run(s, 0.1);
    expect(events.filter((e) => e.type === "pads").length + run(s, 0.3).filter((e) => e.type === "pads").length).toBeGreaterThanOrEqual(3);
    run(s, 2);
    for (const l of s.linemen) expect(Math.abs(l.pos.x - s.drive.los)).toBeLessThan(5);
  });

  it("lets a rusher through more easily when he holds Rush", () => {
    const through = (rush: boolean) => {
      const s = snapped(game());
      const d = bySeat(s, 3);
      place(d, s.drive.los + 2.5, s.drive.ballZ + 0.8);
      run(s, 2, cmd(d.id, { move: v2(-1, 0), rush }));
      return s.drive.los - d.pos.x;
    };
    expect(through(true)).toBeGreaterThan(through(false) + 1);
  });
});

describe("guard", () => {
  it("tails the runner without the stick", () => {
    const s = snapped(game());
    const d = bySeat(s, 3);
    const r = bySeat(s, 1);
    place(r, s.drive.los + 3, -8);
    place(d, s.drive.los + 7, -8);
    run(s, 2.5, new Map([[r.id, { move: v2(0.6, 0.8) }], [d.id, { move: v2(), guard: true }]]));
    expect(d.guard.mark).toBe(r.id);
    expect(dist(d.pos, r.pos)).toBeLessThan(3.5);
  });
});

describe("dives", () => {
  it("end the play with the ball stretched out ahead", () => {
    const s = snapped(game());
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    place(r, s.drive.los + 5, 0, 6, 0);
    const from = r.pos.x;
    const events = run(s, 0.6, cmd(r.id, { move: v2(1, 0), dive: true }));
    expect(events.some((e) => e.type === "dive")).toBe(true);
    expect(events.find((e) => e.type === "playEnd")).toMatchObject({ end: "dive" });
    expect(s.play.spot.x).toBeGreaterThan(from + 2);
  });

  it("score when the ball crosses the goal line", () => {
    const s = game();
    s.drive = newDrive(0, xFromGoal(0, 8));
    beginCall(s);
    snapped(s);
    const r = bySeat(s, 1);
    giveBall(s, r.id);
    place(r, xFromGoal(0, 1.5), 4, 6, 0);
    run(s, 0.6, cmd(r.id, { move: v2(1, 0), dive: true }));
    expect(s.score[0]).toBe(6);
  });
});

describe("controls and views", () => {
  it("switch the quarterback from the pocket to a runner once he throws", () => {
    const s = snapped(game());
    expect(seatControls(s, 0)?.mode).toBe("pocket");
    expect(seatControls(s, 1)?.mode).toBe("runner");
    expect(seatControls(s, 3)?.mode).toBe("defense");
    const qb = bySeat(s, 0);
    run(s, 1 / 60, cmd(qb.id, { aim: v2(1, -0.7) }));
    expect(viewOf(s).athletes.find((a) => a.targeted)).toBeDefined();
    run(s, 1 / 60, cmd(qb.id, { throw: true }));
    expect(seatControls(s, 0)?.mode).toBe("runner");
    const v = viewOf(s);
    expect(v.ball.mode).toBe("spiral");
    expect(v.ball.rpm).toBeGreaterThan(400);
    expect(v.pass).not.toBeNull();
  });

  it("shows the lines and the down like a broadcast", () => {
    const v = viewOf(game());
    expect(v.downText).toBe("1st & 10");
    expect(v.spotText).toBe("OWN 25");
    expect(v.firstDown - v.los).toBeCloseTo(10);
    expect(v.linemen).toHaveLength(6);
  });
});

describe("dropped phones", () => {
  it("hand the player to the computer until the phone is back", () => {
    const s = game("easy");
    setOnline(s, 1, false);
    snapped(s);
    const r = bySeat(s, 1);
    const from = { ...r.pos };
    run(s, 1.5);
    expect(dist(r.pos, from)).toBeGreaterThan(3);
    setOnline(s, 1, true);
    expect(r.online).toBe(true);
  });
});

describe("difficulty", () => {
  it("defaults to Easy", () => {
    expect(DEFAULT_OPTIONS.level).toBe("easy");
  });

  it("leaves computer players standing still in Training", () => {
    const s = snapped(game("training"));
    const bots = s.athletes.filter((a) => a.seat === null);
    const before = bots.map((a) => ({ ...a.pos }));
    run(s, 3);
    bots.forEach((a, i) => expect(dist(a.pos, before[i]!)).toBeLessThan(0.5));
  });
});
