import { buildOf } from "./athlete";
import { releaseSpread } from "./bot/shot-value";
import { handTo } from "./check-plan";
import { walkTo } from "./check-up";
import { returnToss, type Toss } from "./check-toss";
import { LINE, lineUp } from "./free-throw-plan";
import { bouncePass, collectBall, newOfficial, REF, settleOfficial, turnTo, walkOfficial, type Official } from "./free-throw-ref";
import type { Match } from "./match";
import { gaussian } from "./rng";
import { GREEN_MS } from "./shot-model";
import { releaseJumper, startJumper } from "./shooting";
import { CHECK, FREE_THROW as FT, RULES } from "./tuning";
import type { Athlete } from "./types";
import { yawOf, type V2 } from "./vec";

export { lineBouncing, stepFreeThrowBall } from "./free-throw-ball";

/**
 * The free throws after a foul. The whistle stops everyone where they
 * are while the referee makes the call; then the fouled player walks to
 * the line, the ball comes back to them, and the rest line up along the
 * lane. Each shot uses the shot meter: the player's own on their phone,
 * or a computer's steady hand. After every shot but the last the
 * referee collects the ball, walks it up the lane and bounce passes it
 * back to the shooter (`free-throw-ref.ts`). The last is live: play
 * restarts as it leaves the hand, so a miss is anyone's rebound.
 */

export type FreeThrowStage = "whistle" | "walk" | "set" | "shooting" | "result" | "collect" | "carry" | "return";

export interface FreeThrows {
  shooter: number;
  fouler: number;
  /** Which shot is next, or in the air, from 1. */
  shot: number;
  /** How many there are: one after an and one, two, or three for a fouled three. */
  shots: 1 | 2 | 3;
  stage: FreeThrowStage;
  /** Seconds into the stage. */
  t: number;
  /** How long everyone holds still for the referee before walking. */
  whistle: number;
  spots: Map<number, V2>;
  toss: Toss | null;
  /** How long a computer holds Shoot, in milliseconds, once it has started its shot. */
  botRelease: number | null;
  /** The referee working the line. */
  official: Official;
}

/** Stops play for free throws. The ball finishes what it was doing until the walk to the line. */
export function startFreeThrows(m: Match, fouler: Athlete, victim: Athlete, shots: 1 | 2 | 3, whistle: number): void {
  for (const a of [fouler, victim]) if (a.action.kind === "steal" || a.action.kind === "move") a.action = { kind: "none" };
  // The fouled team restarts from the line, so there is nothing left to clear.
  m.needsClear = false;
  m.offence = victim.team;
  m.phase = "freeThrow";
  m.phaseT = 0;
  m.freeThrows = { shooter: victim.id, fouler: fouler.id, shot: 1, shots, stage: "whistle", t: 0, whistle, spots: lineUp(m, victim), toss: null, botRelease: null, official: newOfficial(m.foulCall?.spot ?? victim) };
}

function stage(ft: FreeThrows, next: FreeThrowStage): void {
  ft.stage = next;
  ft.t = 0;
}

/** Steps the free throws on. Everyone is steered here, so the sticks do nothing until play is live. */
export function updateFreeThrows(m: Match, dt: number): void {
  const ft = m.freeThrows;
  if (!ft) return;
  ft.t += dt;
  const shooter = m.athletes[ft.shooter]!;
  const walking = ft.stage === "walk";
  let settled = true;
  for (const a of m.athletes) {
    a.move = { x: 0, z: 0 };
    if (walking && walkTo(m, a, ft.spots.get(a.id)!, CHECK.walk) > CHECK.onSpot) settled = false;
  }
  official(m, ft, dt);
  switch (ft.stage) {
    case "whistle":
      if (ft.t < ft.whistle) return;
      m.foulCall = null;
      // The ball comes back to the shooter from wherever the play left it.
      if (m.ball.holder !== shooter.id) ft.toss = returnToss(m, shooter);
      return stage(ft, "walk");
    case "walk":
      if ((!settled || ft.toss) && ft.t < FT.maxWalk) return;
      // Anyone still on the way is put on their spot, so a crowd in the lane never stalls the game.
      if (!settled) for (const a of m.athletes) placeOn(a, ft.spots.get(a.id)!);
      if (m.ball.holder !== shooter.id) handTo(m, shooter.id);
      ft.toss = null;
      return ready(m, ft);
    case "set":
      if (shooter.action.kind === "shoot") return stage(ft, "shooting");
      // A computer takes its time at the line; a phone that waits too long gets its shot taken for it.
      if ((shooter.auto && ft.t >= FT.botWait) || ft.t >= FT.humanWait) botShoot(m, ft, shooter);
      return;
    case "shooting":
      return shooting(m, ft, shooter);
    case "result":
      // Once the ball is down off the rim or through the net, the referee goes for it.
      if (ft.t >= FT.resultPause && m.ball.mode === "loose" && m.ball.pos.y < 2.6) stage(ft, "collect");
      return;
    case "collect":
      if (collectBall(m, ft.official, ft.t, dt)) stage(ft, "carry");
      return;
    case "carry":
      // Up from the pick up first, then the walk.
      if (ft.official.act !== "scoop" && walkOfficial(ft.official, REF.pass, REF.walk, dt) < 0.05) stage(ft, "return");
      return;
    case "return":
      if (!ft.toss) ft.toss = bouncePass(m, ft.official, shooter.id, dt);
      return;
  }
}

/** The referee's own walk when he is not working the ball: to the baseline, facing the line. */
function official(m: Match, ft: FreeThrows, dt: number): void {
  const o = ft.official;
  if (ft.stage === "whistle") {
    o.speed = 0;
    return;
  }
  if (ft.stage === "walk" && !m.foulCall) {
    if (walkOfficial(o, REF.base, REF.walk, dt) < 0.05) turnTo(o, yawOf(LINE.x - o.x, LINE.z - o.z), dt);
    return;
  }
  if (ft.stage === "set" || ft.stage === "shooting" || ft.stage === "result" || (ft.stage === "return" && ft.toss)) settleOfficial(o, LINE, dt);
}

function shooting(m: Match, ft: FreeThrows, shooter: Athlete): void {
  const act = shooter.action;
  if (act.kind === "shoot" && !act.released && ft.botRelease !== null && act.t * 1000 >= ft.botRelease) releaseJumper(m, shooter, ft.botRelease);
  if (m.ball.mode !== "flight") return;
  ft.botRelease = null;
  if (ft.shot >= ft.shots) return goLive(m);
  stage(ft, "result");
}

/** The shooter is set at the line with the ball. */
export function ready(m: Match, ft: FreeThrows): void {
  stage(ft, "set");
  m.emit({ type: "freeThrow", id: ft.shooter, n: ft.shot, of: ft.shots });
}

function botShoot(m: Match, ft: FreeThrows, shooter: Athlete): void {
  const st = buildOf(shooter).stats;
  startJumper(m, shooter, true);
  ft.botRelease = GREEN_MS + gaussian(m.rng, releaseSpread(st.shooting) * 0.8 * m.bots.spread);
  stage(ft, "shooting");
}

/** Shoot pressed during the free throws: only the shooter, only once set at the line. */
export function pressFreeThrow(m: Match, a: Athlete): void {
  const ft = m.freeThrows;
  if (!ft || ft.stage !== "set" || a.id !== ft.shooter || m.ball.holder !== a.id || a.action.kind !== "none") return;
  startJumper(m, a, true);
  stage(ft, "shooting");
}

/** The last free throw is in the air: play is live again, and a miss is anyone's rebound. */
function goLive(m: Match): void {
  m.phase = "live";
  m.phaseT = 0;
  m.freeThrows = null;
  // The foul ended that possession, so the reach count starts again with the rebound.
  m.stealLog.reset();
  m.shotClock = RULES.shotClock;
  m.clockWarned = false;
  m.brains.reset();
}

function placeOn(a: Athlete, spot: V2): void {
  a.x = spot.x;
  a.z = spot.z;
  a.vx = a.vz = 0;
  if (a.action.kind !== "shoot") a.action = { kind: "none" };
}
