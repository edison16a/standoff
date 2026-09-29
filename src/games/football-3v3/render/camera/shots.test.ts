import { describe, expect, it } from "vitest";
import { POSTS } from "../../engine/field";
import { freshView, viewWhen } from "../test-views";
import { aimFor, behind, closeup, kickCam, playSign } from "./shots";

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
});
