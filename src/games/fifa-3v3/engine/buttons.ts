import { isHuman } from "./athlete";
import { planPass, shotAimZ } from "./assist";
import { autoShootAt, chargeLevel, isTap } from "./charge";
import { botPass, owns, startKick, startShot } from "./kick";
import { startSkill } from "./skills";
import { startSlide } from "./tackle";
import { SHOOT } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import type { Vec2 } from "./vec";

/**
 * The two buttons, with the same rules for phones and computer players.
 *
 * Shoot/Pass: a tap passes, the way the stick points. Held past a tap
 * the charge bar fills, and letting go shoots with that much power. A
 * press and release just before the ball arrives is played first time.
 *
 * Slide/Skill: without the ball a slide tackle, with it a skill move.
 */
export function applyButtons(state: MatchState, a: Athlete, c: Command, dt: number): void {
  const has = owns(state, a);
  const free = a.action === "free";
  if (c.shootDown) {
    a.charging = true;
    a.charge = 0;
    a.release = null;
    if (!has) callForBall(state, a);
  }
  if (c.shoot !== undefined && has && free && !a.charging) {
    // A computer player holds Shoot until the bar reaches the level it wants.
    a.charging = true;
    a.charge = 0;
    a.release = c.shoot;
  }
  if (a.charging) a.charge += dt;
  if (c.shootUp && a.charging) release(state, a, c.held ?? a.charge, c.aim ?? c.move);
  else if (a.charging && has && free) {
    if (a.release !== null && chargeLevel(a.charge) >= a.release) shootNow(state, a, null, a.charge);
    else if (a.charge >= autoShootAt()) shootNow(state, a, c.move, a.charge);
  }
  if (c.passTo !== undefined && has && free) botPass(state, a, c.passTo);
  if (c.slide && a.action === "free") {
    if (has) startSkill(state, a, c.move);
    else startSlide(state, a, c.move);
  }
  a.buffered = Math.max(0, a.buffered - dt);
}

/** Shoot/Pass let go: a pass or a shot now, or remembered for a first time kick. */
function release(state: MatchState, a: Athlete, held: number, stick: Vec2): void {
  a.charging = false;
  a.release = null;
  if (owns(state, a) && a.action === "free") {
    if (isTap(held)) passNow(state, a, stick);
    else shootNow(state, a, stick, held);
    return;
  }
  a.buffered = SHOOT.buffer;
  a.bufferAim = stick;
  a.bufferHeld = held;
}

/** The assisted pass: to the team mate the stick points at, or into space. */
export function passNow(state: MatchState, a: Athlete, stick: Vec2 | null): void {
  startKick(state, a, planPass(state, a, stick), 0.5);
}

/**
 * A shot at the power the bar reached. A computer player aims where it
 * chose when it started charging; a phone's player where the stick points.
 */
export function shootNow(state: MatchState, a: Athlete, stick: Vec2 | null, held: number): void {
  const aimZ = stick ? shotAimZ(a, stick) : a.aimZ;
  a.charging = false;
  a.release = null;
  startShot(state, a, chargeLevel(held), aimZ);
}

/** The kick a player lined up before the ball arrived, played the moment it does. */
export function firstTime(state: MatchState, a: Athlete): void {
  if (a.buffered <= 0 || a.charging || a.action !== "free") return;
  if (isTap(a.bufferHeld)) passNow(state, a, a.bufferAim);
  else shootNow(state, a, a.bufferAim ?? { x: 0, z: 0 }, a.bufferHeld);
  a.buffered = 0;
  a.bufferAim = null;
}

/** A phone's player without the ball asks a computer team mate on the ball to pass it. */
function callForBall(state: MatchState, a: Athlete): void {
  const owner = state.ball.owner;
  if (owner?.kind !== "athlete") return;
  const carrier = state.athletes[owner.id]!;
  if (carrier.team !== a.team || carrier.id === a.id || isHuman(carrier)) return;
  carrier.brain.caller = a.id;
  carrier.brain.callFor = 1;
  carrier.brain.thinkIn = 0;
}
