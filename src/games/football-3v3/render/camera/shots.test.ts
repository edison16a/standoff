import { describe, expect, it } from "vitest";
import { POSTS } from "../../engine/field";
import type { MatchView } from "../../engine/view";
import { freshView, viewWhen } from "../test-views";
import { CameraDirector } from "./director";
import { fitWidth, sideReach } from "./fit";
import { aimFor, behind, closeup, kickCam, playSign, type Aim, type Vec } from "./shots";

/** How far off the middle of the picture a point sits, as a share of the half width. */
function across(aim: Aim, p: Vec, aspect: number): number {
  const d = { x: aim.look.x - aim.pos.x, y: aim.look.y - aim.pos.y, z: aim.look.z - aim.pos.z };
  const l = Math.hypot(d.x, d.y, d.z);
  const f = Math.hypot(d.x, d.z);
  const r = { x: p.x - aim.pos.x, y: p.y - aim.pos.y, z: p.z - aim.pos.z };
  const depth = (r.x * d.x + r.y * d.y + r.z * d.z) / l;
  const side = (r.x * -d.z + r.z * d.x) / f;
  return Math.abs(side) / depth / sideReach(aim.fov, aspect);
}

describe("camera shots", () => {
  it("sits behind the offense and looks downfield past the line", () => {
    const v = freshView();
    v.drive = { ...v.drive, offense: 0, losX: -10, ballZ: 4 };
    const a = behind(v);
    expect(a.pos.x).toBeLessThan(-10);
    expect(a.look.x).toBeGreaterThan(-10);
    expect(a.pos.y).toBeGreaterThan(5);
    v.drive = { ...v.drive, offense: 1, losX: 10 };
    const b = behind(v);
    expect(b.pos.x).toBeGreaterThan(10);
    expect(b.look.x).toBeLessThan(10);
  });

  it("follows the team that has the ball after a turnover", () => {
    const v = freshView();
    v.phase = "live";
    const defender = v.athletes.find((a) => a.team === 1 && a.role === "runner")!;
    v.ball = { ...v.ball, state: "held", holder: defender.id };
    expect(v.drive.offense).toBe(0);
    expect(playSign(v)).toBe(-1);
  });

  it("frames the posts from behind the kicker, then chases the ball", () => {
    const v = freshView();
    const kicker = v.athletes.find((a) => a.role === "qb" && a.team === 0)!;
    kicker.x = 20;
    kicker.z = 0;
    v.phase = "kick";
    v.kick = { kicker: kicker.id, fieldGoal: true, stage: "aim", aim: 0, power: 0, green: 0.1, inGreen: null };
    const set = kickCam(v);
    expect(set.pos.x).toBeLessThan(20);
    expect(set.pos.y).toBeLessThan(3);
    expect(set.look.x).toBeGreaterThan(20);
    v.ball = { ...v.ball, state: "kick", x: 40, y: 8, z: 0 };
    const flying = kickCam(v);
    expect(flying.pos.x).toBeLessThan(40);
    expect(flying.look.x).toBeGreaterThan(40);
    expect(flying.look.x).toBeLessThan(POSTS.x);
  });

  it("goes in close on the scorer for a touchdown", () => {
    const v = viewWhen((x) => x.phase === "touchdown", 400);
    expect(v).not.toBeNull();
    const a = closeup(v!, 0);
    const scorer = v!.athletes.find((x) => x.id === v!.scorer)!;
    expect(Math.hypot(a.pos.x - scorer.x, a.pos.z - scorer.z)).toBeLessThan(9);
    expect(aimFor(v!, 0).kind).toBe("closeup");
  });

  it("backs up before the snap until the receivers split wide are in the picture", () => {
    const v = freshView();
    const aim = behind(v);
    const wide = aim.keep!.reduce((m, p) => (Math.abs(p.z) > Math.abs(m.z) ? p : m));
    expect(Math.abs(wide.z)).toBeGreaterThan(10);
    for (const aspect of [16 / 9, 4 / 3]) {
      const fitted = fitWidth(aim, aspect);
      for (const p of aim.keep!) expect(across(fitted, p, aspect)).toBeLessThan(0.9);
      // Straight back along the line of sight: the tilt and the middle of the picture stay put.
      const tilt = (a: Aim) => (a.pos.y - a.look.y) / Math.hypot(a.pos.x - a.look.x, a.pos.z - a.look.z);
      expect(tilt(fitted)).toBeCloseTo(tilt(aim));
    }
    expect(fitWidth(aim, 4 / 3).pos.x).toBeLessThan(fitWidth(aim, 16 / 9).pos.x);
  });

  it("comes in tighter behind a runner than behind the QB in the pocket", () => {
    const v = freshView();
    v.phase = "live";
    const qb = v.athletes.find((a) => a.role === "qb" && a.team === 0)!;
    const runner = v.athletes.find((a) => a.role === "runner" && a.team === 0)!;
    runner.x = v.drive.losX + 15;
    v.ball = { ...v.ball, state: "held", holder: qb.id, x: qb.x, z: qb.z };
    const pocket = behind(v);
    v.ball = { ...v.ball, state: "held", holder: runner.id, x: runner.x, z: runner.z };
    const run = behind(v);
    const gap = (a: Aim, x: number) => x - a.pos.x;
    expect(gap(run, runner.x)).toBeLessThan(gap(pocket, qb.x));
    expect(pocket.keep!.length).toBeGreaterThan(1);
  });
});

/** The same moment with the whole play `dx` metres further down the field. */
function shifted(v: MatchView, dx: number): MatchView {
  return {
    ...v,
    drive: { ...v.drive, losX: v.drive.losX + dx },
    ball: { ...v.ball, x: v.ball.x + dx },
    athletes: v.athletes.map((a) => ({ ...a, x: a.x + dx })),
  };
}

describe("the director", () => {
  it("says which way up the screen is on the ground, for the phone sticks", () => {
    const d = new CameraDirector();
    const v = freshView();
    d.update(v, 1 / 60, 0);
    const f = d.groundForward();
    // Behind Storm, who attack toward +x, up the screen is downfield.
    expect(f.x).toBeGreaterThan(0.9);
    expect(Math.hypot(f.x, f.z)).toBeCloseTo(1);
  });

  it("cuts to a spot far down the field instead of sweeping across it", () => {
    const d = new CameraDirector();
    const v = freshView();
    d.update(v, 1 / 60, 0);
    const moved = shifted(v, 40);
    d.update(moved, 1 / 60, 0.02);
    expect(d.camera.position.x).toBeCloseTo(fitWidth(behind(moved), d.camera.aspect).pos.x, 0);
  });

  it("glides after a small move", () => {
    const d = new CameraDirector();
    const v = freshView();
    d.update(v, 1 / 60, 0);
    const before = d.camera.position.x;
    const moved = shifted(v, 4);
    const target = fitWidth(behind(moved), d.camera.aspect).pos.x;
    d.update(moved, 1 / 60, 0.02);
    expect(Math.abs(target - before)).toBeGreaterThan(3);
    expect(Math.abs(d.camera.position.x - before)).toBeLessThan(0.2 * Math.abs(target - before));
  });
});
