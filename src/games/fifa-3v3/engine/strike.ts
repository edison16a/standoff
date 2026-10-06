import { other } from "../teams";
import { topSpeed } from "./athlete";
import { shotSpread } from "./charge";
import { strikePace } from "./build-effects";
import { goalX, toGoal } from "./goal";
import { planDive, screened } from "./keeper-read";
import { solveKick, type Kick } from "./shot-aim";
import { chargeDown } from "./shot-block";
import { applyError, strikeError } from "./shot-error";
import { autoAimZ, autoCurl, redness, shotHeight } from "./shot-plan";
import { BALL, PITCH, SHOOT, TOUCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, dist, len, type Vec3 } from "./vec";

/** The widest a shot can be aimed and still be meant for inside the post. */
const AIM_WIDE = PITCH.goalHalfWidth - PITCH.postRadius - BALL.radius - 0.08;

/**
 * The shot itself. The striker picks a spot on the goal (the corner
 * from the stick or the game, the height from the bar) and the kick is
 * solved to fly there with its pace and curl. Then the boot's error is
 * put in, and from there it is all the flight: defenders lunge into its
 * path if they can reach it, the keeper reads it and dives, and the
 * gloves, a body, the woodwork or the net decide what happens.
 */
export function strike(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const defending = other(a.team);
  const keeper = state.keepers[defending];
  const rng = state.rng;
  let pressure = 0;
  for (const o of state.athletes) if (o.team !== a.team) pressure = Math.max(pressure, clamp01((2.4 - dist(o.pos, a.pos)) / 1.8));
  const rigged = state.options.rig?.(state.shotCount, a.team) === "goal";
  // A rigged goal for the showcase goes into the side of the goal away from the keeper.
  const away = keeper.pos.z > 0 ? -1 : 1;
  const aimZ = rigged ? away * (AIM_WIDE - 0.5) : clamp(a.aimZ ?? autoAimZ(ball.pos, keeper.pos), -AIM_WIDE - 1.5, AIM_WIDE + 1.5);
  const distance = toGoal(ball.pos, defending);
  const target: Vec3 = { x: goalX(defending), y: Math.min(PITCH.goalHeight - BALL.radius - 0.2, shotHeight(a.power, rng.next())), z: aimZ };
  // The bar sets the pace; a long range effort needs a little extra to get there, and a big shot adds its own.
  const bar = SHOOT.minSpeed + (SHOOT.maxSpeed - SHOOT.minSpeed) * a.power ** 0.85 + distance * 0.12;
  const speed = clamp(bar * strikePace(a), SHOOT.minSpeed, SHOOT.maxSpeed * strikePace(a));
  const curl = autoCurl(ball.pos, target.z, defending, a.attrs.finishing);
  const from = { ...ball.pos };
  let kick = solveKick(from, target, speed, curl);
  if (!rigged) {
    const error = strikeError(
      {
        finishing: a.attrs.finishing,
        spread: shotSpread(a.power),
        red: redness(a.power),
        pressure,
        firstTime: a.firstTime,
        pace: len(a.vel) / topSpeed(a),
        volley: ball.pos.y > BALL.radius + 0.25,
      },
      rng,
    );
    kick = applyError(kick, error);
  }
  sendShot(state, a, kick, target, { rigged, distance, header: false });
}

/**
 * The ball leaves the boot (or the head) as a shot: its flight starts,
 * defenders in its path throw themselves in, the keeper reads it, and
 * the strike counts in the stats.
 */
export function sendShot(state: MatchState, a: Athlete, kick: Kick, target: Vec3, o: { rigged: boolean; distance: number; header: boolean }): void {
  const ball = state.ball;
  const keeper = state.keepers[other(a.team)];
  const from = { ...ball.pos };
  ball.owner = null;
  ball.vel = kick.vel;
  ball.spin = kick.spin;
  // Struck hard with hardly any spin, the ball knuckles: its swing is set here, from the dice.
  ball.wobble = Math.hypot(kick.spin.x, kick.spin.y, kick.spin.z) < 4 && len(kick.vel) > 20 ? state.rng.range(0.1, Math.PI * 2) : 0;
  ball.travel = 0;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.struckAt = state.time;
  ball.passTo = null;
  a.noTouch = TOUCH.afterKick;
  a.stats.shots++;
  state.shotCount++;
  state.flight = { shooter: a.id, team: a.team, outcome: null, t: 0, target, keeperX: keeper.pos.x, power: a.power, resolved: false, blocker: null };
  if (!o.rigged) state.flight.blocker = chargeDown(state, a, from, kick, target.x);
  // Through a crowd the keeper sees the strike late and reads it worse.
  const unsighted = screened(state, keeper, a.team);
  planDive(state, keeper, o.rigged ? { short: true } : unsighted ? { misread: 0.25, react: 0.3 } : { windup: true });
  state.events.push({ type: "shot", athlete: a.id, team: a.team, power: a.power, distance: o.distance, ...(o.header ? { header: true } : {}) });
}
