import { attackSign, other } from "../teams";
import { newBall, stepBall } from "./ball";
import { shotSpread } from "./charge";
import { freeKick } from "./free-kick";
import { goalX } from "./goal";
import { SET_KICK, spotBall } from "./set-piece-aim";
import { solveKick, type Kick } from "./shot-aim";
import { STEP } from "./tuning";
import type { Rng } from "./rng";
import type { SetPiece } from "./types";
import { clamp, type Vec3 } from "./vec";

/**
 * Set pieces off the boot: penalties, the real strike with its error,
 * and the white line. The free kick itself is solved in free-kick.ts.
 */
export { crossHeight, SET_KICK, spotBall } from "./set-piece-aim";
export { aimSpot, freeKick } from "./free-kick";

/** Where a penalty is aimed on the goal line, in the world. */
export function penaltyTarget(sp: SetPiece): Vec3 {
  const s = attackSign(sp.team);
  return { x: goalX(other(sp.team)), y: clamp(sp.aimY, 0.12, SET_KICK.penHigh), z: s * clamp(sp.aimX, -SET_KICK.penWide, SET_KICK.penWide) };
}

/** A penalty struck at `power` through `target`, with a touch of curl. */
export function penaltyKick(sp: SetPiece, power: number, target: Vec3 = penaltyTarget(sp)): Kick {
  const speed = SET_KICK.penMin + (SET_KICK.penMax - SET_KICK.penMin) * clamp(power, 0, 1);
  return solveKick(spotBall(sp), target, speed, 0);
}

/**
 * The real strike: the planned kick with the error a power level brings.
 * Green goes where it was aimed, yellow drifts a little, and deep in the
 * red it sprays and climbs, so a blasted penalty can fly over.
 */
export function strikeKick(sp: SetPiece, rng: Rng): Kick {
  const p = sp.power;
  const spread = shotSpread(p);
  const red = Math.max(0, p - 0.8) / 0.2;
  if (sp.kind === "penalty") {
    const t = penaltyTarget(sp);
    const aimed = { x: t.x, y: t.y + rng.range(-0.3, 0.6) * spread + red * rng.range(0.4, 1.4), z: t.z + rng.range(-1, 1) * spread * 0.9 };
    return penaltyKick(sp, p, aimed);
  }
  const kick = freeKick({ ...sp, aimX: sp.aimX + rng.range(-1, 1) * spread * 0.06 }, p);
  // A red strike gets under the ball: extra lift.
  kick.vel.y += red * rng.range(0.5, 2.2);
  return kick;
}

/** Points along the planned kick, for the white line: at most `seconds` of flight, stopping past the goal line. */
export function kickPath(sp: SetPiece, seconds = 1.6): Vec3[] {
  const kick = sp.kind === "penalty" ? penaltyKick(sp, SET_KICK.nominal) : freeKick(sp, SET_KICK.nominal);
  const line = goalX(other(sp.team));
  const s = attackSign(sp.team);
  // Flown with the same physics as the match, one point every other step.
  const ball = newBall();
  ball.pos = spotBall(sp);
  ball.vel = { ...kick.vel };
  ball.spin = { ...kick.spin };
  const points: Vec3[] = [{ ...ball.pos }];
  for (let i = 1; i * STEP <= seconds; i++) {
    stepBall(ball, STEP, [], { flightOnly: true });
    if (i % 2 === 0) points.push({ ...ball.pos });
    if ((ball.pos.x - line) * s > 0.3) break;
  }
  return points;
}
