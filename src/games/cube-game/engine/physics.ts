import { orbInReach, padUnder, resolveSolids, touchesSpike } from "./collide";
import type { PlayerEvent, PlayerState } from "./player";
import { BALL, COYOTE, CUBE, FALL_LIMIT, JUMP_BUFFER, ORB, ORB_REACH, PAD, UFO } from "./tuning";
import type { World } from "./world";

const QUARTER = Math.PI / 2;
/** The cube turns half a circle in one full jump, like the original. */
const CUBE_SPIN = Math.PI / ((2 * CUBE.jump) / CUBE.gravity);

/**
 * Uses a waiting jump press, if there is one and the mode allows it now.
 * A cube and a ball need a surface under them (or just behind them). A
 * UFO flaps anywhere. An orb in reach takes the press first.
 */
function useJump(p: PlayerState, world: World, events: PlayerEvent[]): boolean {
  if (p.buffer <= 0) return false;
  const orb = orbInReach(p, world, ORB_REACH);
  if (orb) {
    p.vy = ORB[p.mode] * (p.mode === "ufo" ? 1 : p.gravity);
    events.push({ type: "orb", x: orb.x, y: orb.y });
  } else if (p.mode === "ufo") {
    p.vy = UFO.flap;
    events.push({ type: "flap" });
  } else if (!p.grounded && p.coyote <= 0) {
    return false;
  } else if (p.mode === "cube") {
    p.vy = CUBE.jump * p.gravity;
    events.push({ type: "jump" });
  } else {
    p.gravity = p.gravity === 1 ? -1 : 1;
    p.vy = -BALL.kick * p.gravity;
    events.push({ type: "flip", gravity: p.gravity });
  }
  p.buffer = 0;
  p.coyote = 0;
  p.grounded = false;
  return true;
}

function fall(p: PlayerState, dt: number): void {
  const { gravity, maxFall } = p.mode === "cube" ? CUBE : p.mode === "ufo" ? UFO : BALL;
  const g = p.mode === "ufo" ? 1 : p.gravity;
  p.vy -= gravity * g * dt;
  if (-p.vy * g > maxFall) p.vy = -maxFall * g;
  if (p.mode === "ufo" && p.vy > UFO.maxRise) p.vy = UFO.maxRise;
}

function turn(p: PlayerState, dt: number): void {
  if (p.mode === "ball") {
    p.angle -= (p.gravity * p.speed * dt) / 0.46;
  } else if (p.mode === "ufo") {
    const target = Math.max(-0.45, Math.min(0.45, p.vy * 0.035));
    p.angle += (target - p.angle) * Math.min(1, dt * 12);
  } else if (p.grounded) {
    // Landing settles flat onto the nearest side, quickly but not in one jump.
    const flat = Math.round(p.angle / QUARTER) * QUARTER;
    p.angle += (flat - p.angle) * Math.min(1, dt * 30);
  } else {
    p.angle -= p.gravity * CUBE_SPIN * dt;
  }
}

/**
 * Moves one player one fixed step through the world and says what
 * happened. `pressed` is a jump arriving this step. Everything is
 * deterministic, so a replay of the same presses always ends the same.
 */
export function step(p: PlayerState, world: World, dt: number, pressed: boolean, events: PlayerEvent[] = []): PlayerEvent[] {
  if (p.dead || p.finished) return events;
  if (pressed) p.buffer = JUMP_BUFFER;
  const jumped = useJump(p, world, events);
  fall(p, dt);

  const prevX = p.x;
  const prevY = p.y;
  const speed = world.speedAt(p.x);
  if (speed !== p.speed) events.push({ type: "speed", speed, faster: speed > p.speed });
  p.speed = speed;
  p.x += speed * dt;
  p.y += p.vy * dt;

  const portal = world.portalBetween(prevX, p.x);
  if (portal && portal.mode !== p.mode) {
    p.mode = portal.mode;
    p.gravity = 1;
    // Entering a UFO or ball corridor at a gallop would slam into its ceiling.
    p.vy *= 0.5;
    events.push({ type: "portal", mode: portal.mode });
  }

  const wasGrounded = p.grounded;
  p.grounded = false;
  const alive = resolveSolids(p, prevY, world) && !touchesSpike(p, world) && p.y > FALL_LIMIT;
  if (!alive) {
    p.dead = true;
    events.push({ type: "death", x: p.x, y: p.y });
    return events;
  }
  if (p.grounded && !wasGrounded && !jumped) events.push({ type: "land" });

  const pad = padUnder(p, world);
  if (pad) {
    p.vy = PAD[p.mode] * pad.dir;
    p.grounded = false;
    events.push({ type: "pad", x: pad.x, y: pad.y });
  }

  // A jump buffered in the air fires the moment a surface is under the player.
  if (p.grounded && p.buffer > 0 && !jumped) useJump(p, world, events);
  if (wasGrounded && !p.grounded && !jumped && !pad) p.coyote = COYOTE;
  else if (p.grounded) p.coyote = 0;
  else p.coyote = Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  turn(p, dt);

  if (p.x >= world.level.endX) {
    p.finished = true;
    events.push({ type: "finish" });
  }
  return events;
}
