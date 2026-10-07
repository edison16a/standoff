import { RIM_SPOT } from "../engine/court";
import { stun } from "../engine/juke";
import type { Match } from "../engine/match";
import { basketDir, rightOf } from "../engine/move-pick";
import { MOVES } from "../engine/moves";
import { reactFor } from "../engine/shake";
import { GREEN_MS } from "../engine/shot-model";
import type { DribbleMove } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";

/**
 * Lab scenes for the dribble and the shake: `?lab=move-crossover` and
 * one for every move, each beating a set defender with the reaction made
 * for it and flowing on into the jumper or the drive, `shake-ankles`
 * for a crossover hard enough to drop him, and `dribble` for the
 * dribble presets one after another (jog, sprint, drive, retreat,
 * protect). The Shooter (id 0) has the ball; the Lockdown defender
 * (id 3) is the man to beat.
 */
export const MOVE_LABS = ["move-stepback", "move-betweenLegs", "move-hesitation", "move-crossover", "move-behindBack", "move-spin", "shake-ankles", "dribble"] as const;
export type MoveScene = (typeof MOVE_LABS)[number];

const SHOOTER = 0;
const LOCKDOWN = 3;
const RELEASE = GREEN_MS + 30;

interface MoveSetup {
  move: DribbleMove;
  /** The stick, in the handler's frame: ahead and to his right. */
  aim: { f: number; r: number } | null;
  hard: boolean;
  /** Straight into the jumper off the move, or on to the rim. */
  then: "shoot" | "drive";
}

const SETUPS: Record<Exclude<MoveScene, "dribble">, MoveSetup> = {
  "move-stepback": { move: "stepback", aim: { f: -1, r: 0 }, hard: false, then: "shoot" },
  "move-betweenLegs": { move: "betweenLegs", aim: { f: -0.6, r: -0.8 }, hard: false, then: "shoot" },
  "move-hesitation": { move: "hesitation", aim: null, hard: true, then: "drive" },
  "move-crossover": { move: "crossover", aim: { f: 0, r: -1 }, hard: false, then: "drive" },
  "move-behindBack": { move: "behindBack", aim: { f: 0.1, r: 0 }, hard: false, then: "drive" },
  "move-spin": { move: "spin", aim: { f: 1, r: 0 }, hard: true, then: "drive" },
  "shake-ankles": { move: "crossover", aim: { f: 0, r: 1 }, hard: true, then: "drive" },
};

export function isMoveScene(scene: string): scene is MoveScene {
  return (MOVE_LABS as readonly string[]).includes(scene);
}

/** The reaction a scene shows, for the test. */
export function moveReaction(scene: Exclude<MoveScene, "dribble">): string {
  const s = SETUPS[scene];
  return reactFor(s.move, s.hard);
}

export function moveSpots(scene: MoveScene): [number, number][] {
  // Behind the back wants the man on the ball hand side, so the stick in neutral reads it.
  // A spin goes round him, so he stands a little off its line.
  const man: [number, number] = scene === "move-spin" ? [0.35, 7] : scene === "dribble" ? [5, 9.5] : [0, 7.3];
  return [[0, scene === "dribble" ? 10.4 : 8.6], [-6.5, 10], [6.5, 10.5], man, [-5.5, 12.5], [5.5, 12.5]];
}

export function setupMoves(m: Match): void {
  for (const a of m.athletes) a.auto = false;
  m.ball.holder = SHOOTER;
  // The man to beat squares up to the handler.
  m.athletes[LOCKDOWN]!.yaw = 0;
}

export function steerMoves(scene: MoveScene, m: Match, t: number, once: (key: string) => boolean): void {
  const a = m.athletes[SHOOTER]!;
  if (scene === "dribble") return dribbleTour(m, t);
  const s = SETUPS[scene];
  const d = m.athletes[LOCKDOWN]!;
  d.move = { x: 0, z: 0 };
  const act = a.action;
  if (t > 0.7 && once("move")) {
    a.moveHeat = 0;
    // The lab's fixed seed lands on a lost ball for the move's check; one draw moves it past that.
    m.rng();
    // Neutral on the stick reads the man: on the ball hand it is behind the back, off it a hesitation.
    const right = rightOf(basketDir(a));
    const lean = s.move === "behindBack" ? 0.5 * a.dribbleHand : s.move === "hesitation" ? -0.5 * a.dribbleHand : null;
    if (lean !== null) Object.assign(d, { x: a.x + right.x * lean, z: a.z - 1.3 });
    const f = basketDir(a);
    const r = rightOf(f);
    m.press(SHOOTER, "defend", s.aim ? { x: f.x * s.aim.f + r.x * s.aim.r, z: f.z * s.aim.f + r.z * s.aim.r } : null);
  }
  // The move beats him, with the reaction made for it, just before the engine would check it.
  if (act.kind === "move" && act.t >= MOVES[act.move].at - 0.02 && once("shake")) {
    stun(d, act, s.hard, a);
    m.emit({ type: "shake", id: SHOOTER, victim: LOCKDOWN, hard: s.hard, react: reactFor(act.move, s.hard) });
  }
  if (s.then === "shoot") {
    // Shoot pressed early in the move waits on it and comes straight out of it.
    if (act.kind === "move" && act.t > 0.08 && once("shoot")) m.press(SHOOTER, "shoot");
    // Let go on the green: the jumper's clock carries on from the press, as the phone's hold does.
    if (act.kind === "shoot" && act.t * 1000 >= RELEASE && once("release")) m.release(SHOOTER, RELEASE);
    return;
  }
  if (t < 0.7 || act.kind === "move" || act.kind === "drive" || m.ball.holder !== SHOOTER) {
    if (act.kind !== "move") a.move = { x: 0, z: 0 };
    return;
  }
  const k = dir2(a, RIM_SPOT);
  a.move = { x: k.x, z: k.z };
  if (Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z) < 2.2 && once("finish")) m.press(SHOOTER, "shoot");
}

/** The dribble presets one after another: a jog, a sprint, the drive at the rim, a retreat, then the protect with a man on him. */
function dribbleTour(m: Match, t: number): void {
  const a = m.athletes[SHOOTER]!;
  const d = m.athletes[LOCKDOWN]!;
  const legs: [number, V2][] = [[0.4, { x: 0, z: 0 }], [1.6, { x: 0.45, z: 0 }], [2.8, { x: -1, z: 0 }], [3.8, { x: 0.35, z: -1 }], [4.8, { x: 0, z: 0.55 }], [7, { x: 0, z: 0 }]];
  const leg = legs.find(([until]) => t < until);
  a.move = leg ? leg[1] : { x: 0, z: 0 };
  // At the end a defender walks up into him, and the dribble goes low on the far hip.
  const to = { x: a.x + 0.2, z: a.z - 0.85 };
  const k = dir2(d, to);
  d.move = t > 4.8 && Math.hypot(d.x - to.x, d.z - to.z) > 0.2 ? { x: k.x * 0.8, z: k.z * 0.8 } : { x: 0, z: 0 };
}
