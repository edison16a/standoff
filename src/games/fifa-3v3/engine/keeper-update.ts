import { ballSpeed } from "./ball";
import { goalX, toGoal } from "./goal";
import { claim, hands, keeperHome, outward } from "./keeper";
import { leadFor, openness, passVelocity } from "./passing";
import { KEEPER, PITCH, TOUCH } from "./tuning";
import type { Athlete, Keeper, MatchState } from "./types";
import { angleDiff, clamp, dist, lerp } from "./vec";

/** One step of a keeper: set in position, diving, holding or throwing. */
export function updateKeeper(state: MatchState, k: Keeper, dt: number): void {
  k.actionT += dt;
  k.noTouch = Math.max(0, k.noTouch - dt);
  const ball = state.ball;
  const holding = ball.owner?.kind === "keeper" && ball.owner.team === k.team;
  switch (k.action) {
    case "dive":
      return diving(state, k);
    case "getup":
      if (holding) {
        // Rising with the ball from the turf to the chest.
        Object.assign(ball.pos, hands(k));
        ball.pos.y = lerp(0.25, 1.05, clamp(k.actionT / 0.6, 0, 1));
      }
      if (k.actionT > KEEPER.getUp) setAction(k, holding ? "hold" : "set");
      return;
    case "catch":
      if (k.actionT > 0.45) setAction(k, "hold");
      break;
    case "hold":
      k.holdFor -= dt;
      step(k, { x: goalX(k.team) + outward(k.team) * 1.6, z: k.pos.z * 0.9 }, 2, dt);
      face(k, outward(k.team) > 0 ? 0 : Math.PI, dt);
      if (k.holdFor <= 0 && holding && state.phase === "play") distribute(state, k);
      break;
    case "throw":
      if (k.actionT > 0.6) setAction(k, "set");
      break;
    case "cheer":
      return;
    case "set":
      guard(state, k, dt);
      break;
  }
  if (holding) Object.assign(ball.pos, hands(k));
}

/** A dive is kept through getting up, so the body rises from where it lay. */
function setAction(k: Keeper, action: Keeper["action"]): void {
  k.action = action;
  k.actionT = 0;
  if (action !== "catch" && action !== "getup") k.dive = null;
}

function step(k: Keeper, to: { x: number; z: number }, speed: number, dt: number): void {
  const dx = to.x - k.pos.x;
  const dz = to.z - k.pos.z;
  const d = Math.hypot(dx, dz);
  const move = Math.min(d, speed * dt);
  k.vel.x = d > 1e-4 ? (dx / d) * (move / dt) : 0;
  k.vel.z = d > 1e-4 ? (dz / d) * (move / dt) : 0;
  if (d > 1e-4) {
    k.pos.x += (dx / d) * move;
    k.pos.z += (dz / d) * move;
  }
  // Never back over the goal line: a keeper there would carry a claimed ball into the net.
  const gx = goalX(k.team);
  const out = outward(k.team);
  if ((k.pos.x - gx) * out < KEEPER.lineGap) k.pos.x = gx + out * KEEPER.lineGap;
}

function face(k: Keeper, angle: number, dt: number): void {
  k.facing += clamp(angleDiff(k.facing, angle), -10 * dt, 10 * dt);
}

/** Following the ball, rushing out for loose balls in the box, and smothering at a striker's feet. */
function guard(state: MatchState, k: Keeper, dt: number): void {
  const ball = state.ball;
  const shotLive = state.flight !== null && !state.flight.resolved;
  face(k, Math.atan2(ball.pos.z - k.pos.z, ball.pos.x - k.pos.x), dt);
  const inBox = toGoal(ball.pos, k.team) < PITCH.boxRadius;
  if (!shotLive && inBox && k.noTouch <= 0 && ball.inGoal === null && state.phase === "play") {
    const loose = ball.owner === null && ball.pos.y < 2.2 && ballSpeed(ball) < 14;
    const d = dist(k.pos, ball.pos);
    if (loose && d < KEEPER.claimRange) return claim(state, k);
    if (loose && closestTo(state, k)) return step(k, ball.pos, KEEPER.speed, dt);
    const carrier = ball.owner?.kind === "athlete" ? state.athletes[ball.owner.id] : undefined;
    if (carrier && carrier.team !== k.team && d < 3) {
      step(k, ball.pos, KEEPER.speed, dt);
      // Down at the striker's feet: better dribblers slip round more often, and nobody for long.
      if (d < 0.9 && ball.heldFor > 0.25 && state.rng.chance(dt * (3.2 - 2.2 * carrier.dribbling))) return claim(state, k);
      return;
    }
  }
  step(k, keeperHome(state, k), KEEPER.speed * 0.8, dt);
}

/** Whether the keeper will get to a loose ball before any attacker. */
function closestTo(state: MatchState, k: Keeper): boolean {
  const mine = dist(k.pos, state.ball.pos) / KEEPER.speed;
  return state.athletes.every((a) => a.team === k.team || dist(a.pos, state.ball.pos) / 6.5 > mine + 0.1);
}

/**
 * The dive plays out over time: wait for the ball, push off, stretch to
 * the gloves' spot, land, then get up where the body came to rest.
 */
function diving(state: MatchState, k: Keeper): void {
  const dive = k.dive;
  if (!dive) return setAction(k, "set");
  const t = clamp((k.actionT - dive.wait) / dive.duration, 0, 1);
  // Quick off the mark, easing into full stretch.
  const eased = 1 - (1 - t) * (1 - t);
  k.pos.z = lerp(dive.fromZ, dive.toZ, eased);
  const landed = k.actionT - dive.wait - dive.duration;
  const holding = state.ball.owner?.kind === "keeper" && state.ball.owner.team === k.team;
  if (holding) {
    // Clutched at the gloves, then brought down to the turf with the keeper.
    const drop = dive.standing ? 0 : clamp(landed / 0.25, 0, 1);
    Object.assign(state.ball.pos, { x: k.pos.x, y: lerp(dive.height, 0.25, drop), z: dive.gloveZ });
  }
  if (dive.standing) {
    if (landed > 0.25) setAction(k, holding ? "hold" : "set");
    return;
  }
  if (landed > 0.55) {
    k.pos.z = dive.toZ + dive.dir * KEEPER.middle;
    setAction(k, "getup");
  }
}

/** Plays the ball out to the most open team mate, rolled along the turf. */
function distribute(state: MatchState, k: Keeper): void {
  const ball = state.ball;
  let best: Athlete | null = null;
  let bestScore = -Infinity;
  for (const a of state.athletes) {
    if (a.team !== k.team) continue;
    const score = openness(state, a) + state.rng.range(0, 1.5) - Math.abs(a.pos.x - k.pos.x) * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  const from = { x: k.pos.x + outward(k.team) * 0.5, y: 0.4, z: k.pos.z };
  const to = best ? leadFor(from, best) : { x: 0, z: k.pos.z };
  ball.owner = null;
  ball.pos = from;
  ball.vel = passVelocity(from, to, 6.5);
  ball.vel.y = 1.2;
  ball.passTo = best?.id ?? null;
  ball.lastTouch = { team: k.team, id: null };
  k.noTouch = TOUCH.afterKick + 0.8;
  setAction(k, "throw");
  state.events.push({ type: "throw", team: k.team });
}
