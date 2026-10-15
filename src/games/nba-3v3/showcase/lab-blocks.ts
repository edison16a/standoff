import { BLOCK_PRESETS, type BlockPreset } from "../engine/blocks/presets";
import { RIM_SPOT } from "../engine/court";
import type { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import type { LayupKind } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";

/**
 * Lab scenes for the block presets, one each: `?lab=block-rejection`,
 * `block-swat`, `block-chase`, `block-help`, `block-pin`, `block-tip`,
 * `block-miss` (the contest that just misses) and `block-closeout`. The
 * Shooter (id 0) takes a jumper, a three or a layup off a drive; the
 * blocker comes from where the preset is played from and jumps on cue,
 * and the play is set ahead so each can be stepped through frame by
 * frame.
 */
export const BLOCK_SCENES = BLOCK_PRESETS;
export type BlockScene = `block-${BlockPreset}`;
export const BLOCK_LABS: readonly BlockScene[] = BLOCK_SCENES.map((s) => `block-${s}` as const);

const SHOOTER = 0;
const LOCKDOWN = 3;
const ALLROUND = 5;
/** A green release, short of gold: no hand can touch a gold one. */
const RELEASE = GREEN_MS + 30;

interface BlockSetup {
  shot: "jumper" | "layup";
  /** Where the shooter starts, and for a layup the finish he plays. */
  from: V2;
  layup: LayupKind;
  /** Where the blocker starts, and the spot he runs at, if he runs. */
  at: V2;
  run: V2 | null;
  /** When he sets off on that run, and how hard (0 to 1). */
  runAt: number;
  pace: number;
  /** Jump this long after Shoot for a jumper, or this long before the takeoff of a layup. */
  cue: number;
  /** The man guarding the driver, so the blocker is the help. */
  onBall: V2 | null;
}

const ELBOW: BlockSetup = { shot: "jumper", from: { x: 0, z: 6.2 }, layup: "finger", at: { x: 0.8, z: 6.05 }, run: null, runAt: 0.3, pace: 1, cue: 0.25, onBall: null };
const DRIVE: BlockSetup = { ...ELBOW, shot: "layup", from: { x: 0, z: 8.2 }, at: { x: 0.15, z: 2.5 }, cue: 0.12 };

export const BLOCK_SETUPS: Record<BlockScene, BlockSetup> = {
  "block-rejection": DRIVE,
  "block-swat": ELBOW,
  "block-tip": ELBOW,
  "block-miss": ELBOW,
  // Trailing the driver from the top and running him down.
  "block-chase": { ...DRIVE, at: { x: -0.5, z: 8.9 }, run: RIM_SPOT, cue: -0.15 },
  // From the weak side block across the lane, the man on the ball trailing the driver.
  "block-help": { ...DRIVE, at: { x: -3.4, z: 2.6 }, run: { x: 2, z: 2.6 }, runAt: 1.25, cue: 0.12, onBall: { x: 0.9, z: 8.9 } },
  // High off the glass from the wing, met at the board from under the rim on the other side.
  "block-pin": { ...DRIVE, from: { x: 4.2, z: 6 }, layup: "glass", at: { x: 0.2, z: 2.0 }, cue: 0.1 },
  // A three from the top of the key, the defender running out at him from the paint.
  "block-closeout": { ...ELBOW, from: { x: 0, z: 8.7 }, at: { x: 0.6, z: 5.6 }, run: { x: 0.45, z: 8.3 }, runAt: 0.2, pace: 0.75, cue: 0.3 },
};

export function isBlockScene(scene: string): scene is BlockScene {
  return (BLOCK_LABS as readonly string[]).includes(scene);
}

/** The six at the start: the Shooter on his spot, the blocker on his, the man on the ball if there is one, everyone else out of the way. */
export function blockSpots(scene: BlockScene): [number, number][] {
  const s = BLOCK_SETUPS[scene];
  const spots: [number, number][] = [[s.from.x, s.from.z], [-6.5, 10], [6.5, 10.5], [-6, 11.5], [-4, 12.5], [5, 12.5]];
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

/** The preset a scene shows. */
export const presetOf = (scene: BlockScene): BlockPreset => scene.slice("block-".length) as BlockPreset;

export function steerBlock(scene: BlockScene, m: Match, t: number, once: (key: string) => boolean): void {
  const s = BLOCK_SETUPS[scene];
  const a = m.athletes[SHOOTER]!;
  const id = s.onBall ? ALLROUND : LOCKDOWN;
  const d = m.athletes[id]!;
  if (once("play")) m.forcedPreset = presetOf(scene);
  const go = (who: number, to: V2, pace = 1) => {
    const w = m.athletes[who]!;
    const k = dir2(w, to);
    w.move = Math.hypot(w.x - to.x, w.z - to.z) < 0.3 ? { x: 0, z: 0 } : { x: k.x * pace, z: k.z * pace };
  };
  // He keeps running through the crouch of his jump, so the leap carries him on.
  if (s.run && t > s.runAt && d.y < 0.02 && (d.action.kind === "none" || d.action.kind === "block")) go(id, s.run, s.pace);
  else d.move = { x: 0, z: 0 };
  if (s.onBall) go(LOCKDOWN, { x: a.x + 0.5, z: a.z + 0.8 });
  // On defence Pass is Block, whatever the ball handler is doing.
  const jump = () => m.press(id, "pass");
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
    m.forcedFinish = { layup: s.layup };
    m.press(SHOOTER, "shoot");
  }
}
