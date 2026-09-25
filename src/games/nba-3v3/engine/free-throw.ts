import { charOf } from "./athlete";
import { releaseSpread } from "./bot/shot-value";
import { handTo } from "./check-plan";
import { walkTo } from "./check-up";
import { holdAtChest, returnToss, stepToss, type Toss } from "./check-toss";
import { lineUp } from "./free-throw-plan";
import type { Match } from "./match";
import { gaussian } from "./rng";
import { GREEN_MS } from "./shot-model";
import { releaseJumper, startJumper } from "./shooting";
import { CHECK, FREE_THROW as FT, RULES } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * A foul and its two free throws. The whistle stops the clock and
 * everyone where they are; then the fouled player walks to the line
 * and the rest line up along the lane. Each shot uses the shot meter:
 * the player's own on their phone, or a computer's steady hand. The
 * first comes back to the shooter whatever happens. The second is
 * live: play restarts as it leaves the hand, so a miss is a rebound.
 */

export type FreeThrowStage = "whistle" | "walk" | "set" | "shooting" | "result" | "return";

export interface FreeThrows {
  shooter: number;
  fouler: number;
  /** Which of the two shots is next, or in the air. */
  shot: 1 | 2;
  stage: FreeThrowStage;
  /** Seconds into the stage. */
  t: number;
  spots: Map<number, V2>;
  toss: Toss | null;
  /** How long a computer holds Shoot, in milliseconds, once it has started its shot. */
  botRelease: number | null;
}

/** The whistle: the ball dies in the fouled player's hands and the clock stops. */
export function callFoul(m: Match, fouler: Athlete, victim: Athlete): void {
  const attempt = fouler.action.kind === "steal" ? fouler.action.attempt : 0;
  fouler.action = { kind: "none" };
  if (victim.action.kind === "move") victim.action = { kind: "none" };
  handTo(m, victim.id);
  m.phase = "freeThrow";
  m.phaseT = 0;
  m.freeThrows = { shooter: victim.id, fouler: fouler.id, shot: 1, stage: "whistle", t: 0, spots: lineUp(m, victim), toss: null, botRelease: null };
  m.emit({ type: "foul", id: fouler.id, victim: victim.id, attempt });
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
  switch (ft.stage) {
    case "whistle":
      if (ft.t >= FT.whistle) stage(ft, "walk");
      return;
    case "walk":
      if (!settled && ft.t < FT.maxWalk) return;
      // Anyone still on the way is put on their spot, so a crowd in the lane never stalls the game.
      if (!settled) for (const a of m.athletes) placeOn(a, ft.spots.get(a.id)!);
      return ready(m, ft);
    case "set":
      if (shooter.action.kind === "shoot") return stage(ft, "shooting");
      // A computer takes its time at the line; a phone that waits too long gets its shot taken for it.
      if ((shooter.auto && ft.t >= FT.botWait) || ft.t >= FT.humanWait) botShoot(m, ft, shooter);
      return;
    case "shooting":
      return shooting(m, ft, shooter);
    case "result":
      if (ft.t >= FT.resultPause && m.ball.mode === "loose") {
        ft.toss = returnToss(m, shooter);
        stage(ft, "return");
      }
      return;
    case "return":
      return;
  }
}

function shooting(m: Match, ft: FreeThrows, shooter: Athlete): void {
  const act = shooter.action;
  if (act.kind === "shoot" && !act.released && ft.botRelease !== null && act.t * 1000 >= ft.botRelease) releaseJumper(m, shooter, ft.botRelease);
  if (m.ball.mode !== "flight") return;
  ft.botRelease = null;
  if (ft.shot === 2) return goLive(m);
  stage(ft, "result");
}

function ready(m: Match, ft: FreeThrows): void {
  stage(ft, "set");
  m.emit({ type: "freeThrow", id: ft.shooter, n: ft.shot });
}

function botShoot(m: Match, ft: FreeThrows, shooter: Athlete): void {
  const st = charOf(shooter).stats;
  startJumper(m, shooter, true);
  ft.botRelease = GREEN_MS + gaussian(m.rng, releaseSpread(st.shooting) * 0.8);
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

/**
 * Moves the ball while the free throws own it: at the shooter's chest
 * before each shot, and tossed back after the first. Returns false when
 * the shot and its flight are left to the normal ball.
 */
export function stepFreeThrowBall(m: Match, dt: number): boolean {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  if (!ft) return false;
  if (ft.stage === "return" && ft.toss) {
    if (stepToss(m, ft.toss, dt)) {
      ft.toss = null;
      ft.shot = 2;
      m.emit({ type: "catch", id: ft.shooter });
      ready(m, ft);
    }
    return true;
  }
  if (ft.stage === "shooting" || ft.stage === "result") return false;
  holdAtChest(m);
  return true;
}
