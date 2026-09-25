import { charOf, standingReach } from "./athlete";
import type { FlightEvent } from "./flight";
import { sampleFlight } from "./flight";
import { stepLoose, type Contact } from "./loose-ball";
import type { Match } from "./match";
import { gainPossession, missShot, scoreShot } from "./rules";
import { JUMPER } from "./shooting";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dist3, lerp } from "./vec";

/**
 * The ball, every step: in a hand (dribbling, or up for a shot), in
 * flight on its planned path, or loose under physics until someone
 * grabs it.
 */
export function updateBall(m: Match, dt: number): void {
  const b = m.ball;
  b.rimCd = Math.max(0, b.rimCd - dt);
  b.spin *= Math.pow(0.6, dt);
  if (b.mode === "held") return holdBall(m, dt);
  if (b.mode === "flight") return flyBall(m, dt);
  looseBall(m, dt);
}

/** The side and front of the body, for a player facing `yaw`. Right is the player's own right hand. */
function frame(a: Athlete): { fx: number; fz: number; rx: number; rz: number } {
  return { fx: Math.sin(a.yaw), fz: Math.cos(a.yaw), rx: -Math.cos(a.yaw), rz: Math.sin(a.yaw) };
}

function holdBall(m: Match, dt: number): void {
  const b = m.ball;
  const a = m.holder;
  if (!a) {
    b.mode = "loose";
    return;
  }
  const h = charOf(a).build.height;
  const f = frame(a);
  const act = a.action;
  b.vel = { x: a.vx, y: 0, z: a.vz };
  if (act.kind === "shoot" || act.kind === "drive") {
    // Both hands bring it up: to the set point for a jumper, to full stretch at the rim.
    const lift = act.kind === "shoot" ? clamp(act.t / JUMPER.takeoff, 0, 1) : clamp(act.t / act.finish, 0, 1);
    const top = act.kind === "shoot" ? h * 1.12 : standingReach(a) - 0.12;
    const fwd = act.kind === "shoot" ? 0.2 : 0.3;
    b.pos = { x: a.x + f.fx * fwd, y: a.y + lerp(h * 0.62, top, lift), z: a.z + f.fz * fwd };
    return;
  }
  const speed = Math.hypot(a.vx, a.vz);
  const before = a.dribble;
  a.dribble = (a.dribble + (1.7 + speed * 0.22) * dt) % 1;
  if (before < 0.5 && a.dribble >= 0.5) m.emit({ type: "bounce", id: a.id, x: b.pos.x, z: b.pos.z, power: 0.5 + speed / 12 });
  // Pushed down hard, so the bounce is sharp at the floor and slow at the top, where the hand meets it.
  const hand = h * 0.46;
  const drop = 1 - Math.abs(1 - 2 * a.dribble);
  const y = 0.12 + (hand - 0.12) * (1 - drop * drop);
  const fwd = 0.26 + speed * 0.035;
  // Out to the side of the dribbling hand, and through the middle in front during a crossover.
  const side = 0.3 * a.dribbleSide;
  b.pos = { x: a.x + f.fx * fwd + f.rx * side, y, z: a.z + f.fz * fwd + f.rz * side };
}

function onFlightEvent(m: Match, e: FlightEvent): void {
  const shot = m.ball.shot;
  switch (e.kind) {
    case "rim":
      if (shot) shot.touchedRim = true;
      m.ball.rimCd = 0.12;
      return m.emit({ type: "rim", power: e.power });
    case "board":
      return m.emit({ type: "board", power: e.power });
    case "net":
      return m.emit({ type: "net", swish: e.swish });
    case "score":
      return scoreShot(m);
    case "block":
      return;
  }
}

function flyBall(m: Match, dt: number): void {
  const b = m.ball;
  const f = b.flight;
  if (!f) {
    b.mode = "loose";
    return;
  }
  b.flightT += dt;
  const idx = sampleFlight(f, b.flightT, b.pos, b.vel);
  const current = idx === -1 ? f.segments.length - 1 : idx;
  while (b.flightSeg < current) {
    b.flightSeg++;
    for (const e of f.segments[b.flightSeg]!.events) onFlightEvent(m, e);
  }
  if (b.flightKind === "pass" && passCaught(m)) return;
  if (idx !== -1) return;
  const kind = b.flightKind;
  b.mode = "loose";
  b.flight = null;
  b.flightKind = null;
  b.passTo = null;
  if (f.exit) {
    b.vel = { ...f.exit.v };
    for (const e of f.exit.events) onFlightEvent(m, e);
  }
  if ((kind === "shot" || kind === "block") && b.shot && !b.shot.made) missShot(m);
}

/** A pass is caught by its receiver near the chest, or picked off by a defender in the lane. */
function passCaught(m: Match): boolean {
  const b = m.ball;
  const receiver = b.passTo === null ? null : m.athletes[b.passTo];
  if (receiver && receiver.action.kind !== "drive" && dist3(b.pos, { x: receiver.x, y: receiver.y + 1.25, z: receiver.z }) < 0.8) {
    gainPossession(m, receiver);
    receiver.dribble = 0;
    m.emit({ type: "catch", id: receiver.id });
    return true;
  }
  if (b.flightT < 0.08 || !receiver) return false;
  for (const d of m.opponents(receiver.team)) {
    if (b.passRolled.includes(d.id)) continue;
    if (Math.hypot(b.pos.x - d.x, b.pos.z - d.z) > PASS.interceptRange || b.pos.y > standingReach(d) + d.y - 0.15) continue;
    b.passRolled.push(d.id);
    if (d.action.kind !== "none" || m.rng() >= 0.03 + charOf(d).stats.speed * 0.007) continue;
    const passer = b.lastTouch ?? receiver.id;
    gainPossession(m, d);
    d.box.steals++;
    m.emit({ type: "intercept", id: d.id, victim: passer });
    return true;
  }
  return false;
}

function looseBall(m: Match, dt: number): void {
  const b = m.ball;
  const contacts: Contact[] = [];
  stepLoose(b, dt, contacts);
  for (const c of contacts) {
    if (c.kind === "floor") m.emit({ type: "floor", power: c.power, x: b.pos.x, z: b.pos.z });
    else if (c.kind === "board") m.emit({ type: "board", power: Math.min(1, c.power / 5) });
    else if (c.kind === "rim" && b.rimCd <= 0) {
      b.rimCd = 0.1;
      if (b.shot) b.shot.touchedRim = true;
      m.emit({ type: "rim", power: Math.min(1, c.power / 4) });
    } else if (c.kind === "through" && b.shot && !b.shot.counted && m.phase === "live") {
      // A lucky roll off the iron that drops after all still counts.
      b.shot.made = true;
      b.shot.outcome = "roll";
      m.emit({ type: "net", swish: false });
      scoreShot(m);
    }
  }
  // A ball come to rest on top of the glass is nudged back into play.
  if (b.pos.y > 2.5 && Math.hypot(b.vel.x, b.vel.y, b.vel.z) < 0.3) b.vel.z += 1.2;
  if (m.phase === "live") grab(m);
}

/** The nearest player who can reach a loose ball takes it. Jumping reaches higher and a little wider. */
function grab(m: Match): void {
  const b = m.ball;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of m.athletes) {
    const k = a.action.kind;
    if (a.grabCd > 0 || k === "shoot" || k === "drive" || k === "stumble") continue;
    const d = Math.hypot(b.pos.x - a.x, b.pos.z - a.z);
    const jumping = k === "block";
    if (d > (jumping ? 0.8 : 0.58) || b.pos.y > standingReach(a) + a.y + (jumping ? 0.1 : 0)) continue;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  if (!best) return;
  gainPossession(m, best);
  best.dribble = 0;
}
