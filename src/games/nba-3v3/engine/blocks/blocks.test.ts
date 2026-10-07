import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import { Match, type Entry } from "../match";
import { GREEN_MS } from "../shot-model";
import { COURT, STEP } from "../tuning";
import { BLOCK_HITS, type BlockHit } from "./hit";
import type { BlockPlan } from "./plan";
import { jumpStyle } from "./style";

const RELEASE = GREEN_MS + 30;

const ENTRIES: Entry[] = [
  { team: 0, build: "shooter", seat: null },
  { team: 1, build: "big", seat: null },
  { team: 1, build: "playmaker", seat: null },
];

/** The shooter at the elbow, the big man at his shoulder (not square in front, so there is no stepback), the other defender out of the way. */
function setup(seed = 3): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.checkBeat = false;
  m.shotClock = 99;
  const spots: [number, number][] = [[0, 6.2], [0.55, 6.05], [-6, 10]];
  m.athletes.forEach((a, i) => Object.assign(a, { x: spots[i]![0], z: spots[i]![1], vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" }, yaw: i === 0 ? Math.PI : 0 }));
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.drainEvents();
  return m;
}

/** A green jumper (not gold, which no hand can touch) with the big man going up to meet it. */
function shootIntoBlock(m: Match, forced: BlockHit | "miss"): { events: MatchEvent[]; plan: BlockPlan | undefined; planAt: number; blockAt: number } {
  m.forcedHit = forced;
  const events: MatchEvent[] = [];
  let plan: BlockPlan | undefined;
  let planAt = -1;
  let blockAt = -1;
  let jumpStart = 0;
  for (let t = 0; t < 2.4; t += STEP) {
    if (Math.abs(t - 0.05) < STEP / 2) m.press(0, "shoot");
    if (Math.abs(t - 0.05 - RELEASE / 1000) < STEP / 2) m.release(0, RELEASE);
    if (Math.abs(t - 0.3) < STEP / 2) {
      m.press(1, "defend");
      jumpStart = t;
    }
    m.step(STEP);
    const act = m.athletes[1]!.action;
    if (act.kind === "block" && act.plan && !plan) {
      plan = act.plan;
      planAt = jumpStart + act.plan.at;
    }
    for (const e of m.drainEvents()) {
      events.push(e);
      if (e.type === "block") blockAt = t;
    }
  }
  return { events, plan, planAt, blockAt };
}

describe("block presets", () => {
  it("go up the way the play calls for", () => {
    const m = setup();
    const [a, d, help] = m.athletes as [typeof m.athletes[0], typeof m.athletes[1], typeof m.athletes[2]];
    expect(jumpStyle(m, d)).toBe("stand");
    d.vz = -3;
    expect(jumpStyle(m, d)).toBe("run");
    // Behind a man running at the rim and running the same way: the chase down.
    Object.assign(a, { x: 0, z: 4, vx: 0, vz: -5 });
    Object.assign(d, { x: 0.2, z: 5.2, vx: 0, vz: -4.5 });
    expect(jumpStyle(m, d)).toBe("chase");
    // Coming across while his teammate is the man on the ball: weak side help.
    Object.assign(d, { x: 0.1, z: 3.2, vx: 0, vz: 0 });
    Object.assign(help, { x: 2.4, z: 4.2, vx: -3, vz: 0 });
    expect(jumpStyle(m, help)).toBe("help");
  });

  it("decide the touch before the hand gets there, and the hand meets the ball when and where it was planned", () => {
    const m = setup();
    const r = shootIntoBlock(m, "swat");
    expect(r.plan?.hit).toBe("swat");
    const block = r.events.find((e) => e.type === "block");
    expect(block).toMatchObject({ hit: "swat", id: 1 });
    expect(Math.abs(r.blockAt - r.planAt)).toBeLessThan(0.07);
    if (block?.type !== "block" || !r.plan) throw new Error("no block");
    const p = r.plan.point;
    expect(Math.hypot(block.at.x - p.x, block.at.y - p.y, block.at.z - p.z)).toBeLessThan(0.35);
  });

  it("play every hit the block math can call, and let the ball fly off on its own", () => {
    for (const hit of BLOCK_HITS) {
      if (hit === "pin") continue;
      const r = shootIntoBlock(setup(), hit);
      const block = r.events.find((e) => e.type === "block");
      expect(block, hit).toMatchObject({ hit, tip: hit === "tip" });
    }
  });

  it("spike it down and out of bounds", () => {
    const m = setup();
    shootIntoBlock(m, "spike");
    const p = m.ball.pos;
    const out = Math.abs(p.x) > COURT.halfWidth || p.z < 0 || m.events.some((e) => e.type === "violation");
    expect(out || m.phase !== "live").toBe(true);
  });

  it("show a near miss as a reach that never touches it", () => {
    const m = setup();
    const r = shootIntoBlock(m, "miss");
    expect(r.plan).toBeDefined();
    expect(r.plan!.hit).toBeNull();
    expect(r.events.some((e) => e.type === "block")).toBe(false);
    // The shot flies on untouched to the hoop.
    expect(r.events.some((e) => e.type === "net" || e.type === "rim" || e.type === "board")).toBe(true);
  });

  it("turn Guard into a two hand leap on the run to the post as the shot goes up", () => {
    const m = setup();
    const d = m.athletes[2]!;
    m.athletes[2]!.auto = false;
    // Sprinting at the rim from the wing as the jumper goes up.
    m.press(0, "shoot");
    for (let t = 0; t < RELEASE / 1000; t += STEP) m.step(STEP);
    m.release(0, RELEASE);
    Object.assign(d, { x: 3, z: 3.5, vx: -3.2, vz: -1.2 });
    m.press(2, "shoot");
    expect(d.action).toMatchObject({ kind: "block", style: "run" });
    // Standing still, Guard is only the shadow it always is.
    const e = setup();
    e.press(0, "shoot");
    e.press(2, "shoot");
    expect(e.athletes[2]!.action.kind).toBe("none");
    expect(e.athletes[2]!.guard).toBe(true);
  });
});
