import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import { Match, type Entry } from "../match";
import { GREEN_MS } from "../shot-model";
import { COURT, STEP } from "../tuning";
import { LEAD } from "./meet";
import type { BlockPlan } from "./plan";
import { BLOCK_PRESETS, hitFor, type BlockPreset } from "./presets";
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
function shootIntoBlock(m: Match, forced: BlockPreset | null): { events: MatchEvent[]; plan: BlockPlan | undefined; planAt: number; blockAt: number; releasedAt: number } {
  m.forcedPreset = forced;
  m.forcedBlock = true;
  const events: MatchEvent[] = [];
  let plan: BlockPlan | undefined;
  let planAt = -1;
  let blockAt = -1;
  let jumpStart = 0;
  let releasedAt = -1;
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
      if (e.type === "shot" && releasedAt < 0) releasedAt = t;
    }
  }
  return { events, plan, planAt, blockAt, releasedAt };
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

  it("close out on a deep shooter with a running leap", () => {
    const m = setup();
    const [a, d] = m.athletes as [typeof m.athletes[0], typeof m.athletes[1]];
    // Rising for a three from the top, the big man running out at him.
    Object.assign(a, { x: 0, z: 8.4 });
    m.press(0, "shoot");
    Object.assign(d, { x: 0.3, z: 6.2, vx: 0, vz: 3.5 });
    expect(jumpStyle(m, d)).toBe("closeout");
    // Standing in front of him is no closeout.
    Object.assign(d, { vz: 0 });
    expect(jumpStyle(m, d)).toBe("stand");
  });

  it("decide the touch before the hand gets there, and the hand meets the ball when and where it was planned", () => {
    const m = setup();
    const r = shootIntoBlock(m, null);
    if (!r.plan || r.plan.preset === "miss") throw new Error("no touch planned");
    expect(r.plan.hit).toBe(hitFor(r.plan.preset, false));
    const block = r.events.find((e) => e.type === "block");
    expect(block).toMatchObject({ hit: r.plan.hit, preset: r.plan.preset, id: 1 });
    expect(Math.abs(r.blockAt - r.planAt)).toBeLessThan(0.07);
    if (block?.type !== "block" || !r.plan) throw new Error("no block");
    const p = r.plan.point;
    expect(Math.hypot(block.at.x - p.x, block.at.y - p.y, block.at.z - p.z)).toBeLessThan(0.35);
  });

  it("never touch the ball on the frame it leaves the shooter's hand: the strike gets its frames", () => {
    const r = shootIntoBlock(setup(), null);
    expect(r.releasedAt).toBeGreaterThan(0);
    expect(r.blockAt - r.releasedAt).toBeGreaterThanOrEqual(LEAD - 0.02);
  });

  it("play every preset with a touch the lab can ask for, and let the ball fly off on its own", () => {
    for (const preset of BLOCK_PRESETS) {
      if (preset === "miss") continue;
      const r = shootIntoBlock(setup(), preset);
      const block = r.events.find((e) => e.type === "block");
      expect(block, preset).toMatchObject({ preset, tip: preset === "tip" });
    }
  });

  it("swat it into the stands, out of bounds", () => {
    const m = setup();
    shootIntoBlock(m, "swat");
    const p = m.ball.pos;
    const out = Math.abs(p.x) > COURT.halfWidth || p.z < 0 || m.events.some((e) => e.type === "violation");
    expect(out || m.phase !== "live").toBe(true);
  });

  it("show a near miss as a reach that never touches it", () => {
    const m = setup();
    const r = shootIntoBlock(m, "miss");
    m.forcedBlock = false;
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
