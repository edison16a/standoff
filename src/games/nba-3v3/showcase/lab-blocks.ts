import type { BlockHit, BlockPreset } from "../engine/blocks/hit";
import { RIM_SPOT } from "../engine/court";
import type { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import { dir2, type V2 } from "../engine/vec";

/**
 * Lab scenes for the block presets, one each: `?lab=block-stand`,
 * `block-run`, `block-chase`, `block-help`, `block-layup`,
 * `block-spike`, `block-pin`, `block-tip` and `block-miss` (the near
 * miss). The Shooter (id 0) takes a jumper at the elbow or a layup off
 * a drive; the blocker comes from where the preset is played from and
 * jumps on cue, and the hit is set ahead so each can be stepped through
 * frame by frame.
 */
export const BLOCK_SCENES = ["stand", "run", "chase", "help", "layup", "spike", "pin", "tip", "miss"] as const;
export type BlockScene = `block-${(typeof BLOCK_SCENES)[number]}`;
export const BLOCK_LABS: readonly BlockScene[] = BLOCK_SCENES.map((s) => `block-${s}` as const);

const SHOOTER = 0;
const LOCKDOWN = 3;
const ALLROUND = 5;
/** A green release, short of gold: no hand can touch a gold one. */
const RELEASE = GREEN_MS + 30;

interface BlockSetup {
  shot: "jumper" | "layup";
  /** Where the blocker starts, and the spot he runs at, if he runs. */
  at: V2;
  run: V2 | null;
  /** When he sets off on that run. */
  runAt: number;
  /** Jump this long after Shoot for a jumper, or this long before the takeoff of a layup. */
  cue: number;
  /** Guard pressed on the run (a two hand leap) rather than Block. */
  guard: boolean;
  hit: BlockHit | "miss";
  /** The man guarding the driver, so the blocker is the help. */
  onBall: V2 | null;
  /** What the scene should end up playing, or null for the near miss. */
  expect: BlockPreset | null;
}

const JUMPER: BlockSetup = { shot: "jumper", at: { x: 0.8, z: 6.05 }, run: null, runAt: 0.3, cue: 0.25, guard: false, hit: "swat", onBall: null, expect: "stand" };
const LAYUP: BlockSetup = { ...JUMPER, shot: "layup", at: { x: 0.15, z: 2.5 }, cue: 0.12, expect: "layup" };

export const BLOCK_SETUPS: Record<BlockScene, BlockSetup> = {
  "block-stand": JUMPER,
  "block-spike": { ...JUMPER, hit: "spike", expect: "spike" },
  "block-tip": { ...JUMPER, hit: "tip", expect: "tip" },
  "block-miss": { ...JUMPER, hit: "miss", expect: null },
  "block-layup": LAYUP,
  "block-run": { ...LAYUP, at: { x: 5, z: 2.4 }, run: { x: -2, z: 3 }, runAt: 0.85, cue: 0.1, guard: true, expect: "run" },
  "block-chase": { ...LAYUP, at: { x: -0.5, z: 8.9 }, run: RIM_SPOT, cue: -0.15, expect: "chase" },
  "block-pin": { ...LAYUP, at: { x: -0.5, z: 8.9 }, run: RIM_SPOT, cue: -0.15, hit: "pin", expect: "pin" },
  "block-help": { ...LAYUP, at: { x: -3.4, z: 2.6 }, run: { x: 2, z: 2.6 }, runAt: 1.25, cue: 0.12, onBall: { x: 0.9, z: 8.9 }, expect: "help" },
};

export function isBlockScene(scene: string): scene is BlockScene {
  return (BLOCK_LABS as readonly string[]).includes(scene);
}

/** The six at the start: the Shooter on his spot, the blocker on his, the man on the ball if there is one, everyone else out of the way. */
export function blockSpots(scene: BlockScene): [number, number][] {
  const s = BLOCK_SETUPS[scene];
  const spots: [number, number][] = [[0, s.shot === "jumper" ? 6.2 : 8.2], [-6.5, 10], [6.5, 10.5], [-6, 11.5], [-4, 12.5], [5, 12.5]];
  spots[LOCKDOWN] = [s.at.x, s.at.z];
  if (s.onBall) {
    // The help comes from the All Rounder; Lockdown is the man trailing the driver.
    spots[ALLROUND] = [s.at.x, s.at.z];
    spots[LOCKDOWN] = [s.onBall.x, s.onBall.z];
  }
  return spots;
}

/** Nobody plays by himself: the scene moves everyone. */
export function setupBlock(m: Match): void {
  for (const a of m.athletes) a.auto = false;
  m.ball.holder = SHOOTER;
}

export function steerBlock(scene: BlockScene, m: Match, t: number, once: (key: string) => boolean): void {
  const s = BLOCK_SETUPS[scene];
  const a = m.athletes[SHOOTER]!;
  const id = s.onBall ? ALLROUND : LOCKDOWN;
  const d = m.athletes[id]!;
  if (once("hit")) m.forcedHit = s.hit;
  const go = (who: number, to: V2) => {
    const w = m.athletes[who]!;
    const k = dir2(w, to);
    w.move = Math.hypot(w.x - to.x, w.z - to.z) < 0.3 ? { x: 0, z: 0 } : { x: k.x, z: k.z };
  };
  // He keeps running through the crouch of his jump, so the leap carries him on.
  if (s.run && t > s.runAt && d.y < 0.02 && (d.action.kind === "none" || d.action.kind === "block")) go(id, s.run);
  else d.move = { x: 0, z: 0 };
  if (s.onBall) go(LOCKDOWN, { x: a.x + 0.5, z: a.z + 0.8 });
  // On defence Pass is Block, whatever the ball handler is doing; Guard on the run is the leap.
  const jump = () => m.press(id, s.guard ? "shoot" : "pass");
  if (s.shot === "jumper") {
    if (t > 0.4 && once("shoot")) m.press(SHOOTER, "shoot");
    if (t > 0.4 + RELEASE / 1000 && once("release")) m.release(SHOOTER, RELEASE);
    if (t > 0.4 + s.cue && once("jump")) jump();
    return;
  }
  const act = a.action;
  if (act.kind === "drive") {
    a.move = { x: 0, z: 0 };
    if (act.t >= act.takeoff - s.cue && once("jump")) jump();
    return;
  }
  if (m.ball.holder !== SHOOTER) return;
  const k = dir2(a, RIM_SPOT);
  a.move = t < 0.3 ? { x: 0, z: 0 } : { x: k.x, z: k.z };
  // Inside the floater's range, so it is a layup the blocker can meet.
  if (t > 0.6 && Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z) < 2.2 && once("finish")) {
    m.forcedFinish = { layup: "finger" };
    m.press(SHOOTER, "shoot");
  }
}
