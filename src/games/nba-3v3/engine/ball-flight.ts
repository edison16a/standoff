import { blockHook, grab, passCaught } from "./ball-touch";
import type { Match } from "./match";
import { stepBall, type Contact } from "./physics/world";
import { classify, missed, noteContacts } from "./physics/shot-watch";
import { onTheRing, stepShotFlight } from "./shot-outcome/flight";
import { missShot, scoreShot } from "./rules";

/**
 * A ball out of the hands, one frame: the physics moves it, the hands
 * of any defender in the air may get a piece of a shot, and each touch
 * of the floor, the iron or the glass is heard. A shot is followed
 * until it drops or is clearly a miss, a pass until it is caught or
 * gets away, and a loose ball until someone picks it up.
 */
export function freeBall(m: Match, dt: number): void {
  const b = m.ball;
  const contacts: Contact[] = [];
  // A shot flies its planned flight, which may roll round the ring; anything else is plain physics.
  if (b.mode === "flight" && b.flightKind === "shot" && b.shot) stepShotFlight(b, b.shot.flight, dt, contacts, blockHook(m));
  else stepBall(b, dt, contacts, blockHook(m));
  for (const c of contacts) hear(m, c);
  if (b.mode === "flight" && b.flightKind === "shot" && b.shot) followShot(m, contacts, dt);
  else if (b.mode === "flight" && b.flightKind === "pass") followPass(m, contacts);
  else if (b.mode === "flight") {
    // A dunk drops through and a blocked shot flies off: both are loose balls from here.
    if (contacts.some((c) => c.kind === "floor") || b.flightT > 1.2) b.mode = "loose";
  }
  if (b.mode !== "flight") looseDrop(m, contacts);
  // A ball come to rest on top of the glass or the ring is nudged back into play.
  if (b.pos.y > 2.5 && Math.hypot(b.vel.x, b.vel.y, b.vel.z) < 0.2) b.vel.z += 1.2;
  if (m.phase === "live" && b.mode === "loose") grab(m);
}

/** The sound, the shake and the squash of a touch. */
function hear(m: Match, c: Contact): void {
  const b = m.ball;
  if (c.kind === "through") return;
  if (c.power > 1.2) {
    const n = c.kind === "floor" ? { x: 0, y: 1, z: 0 } : unit(b.pos.x - c.at.x, b.pos.y - c.at.y, b.pos.z - c.at.z);
    b.impact = { power: c.power, age: 0, n };
  }
  if (c.kind === "floor" && c.power > 0.6) m.emit({ type: "floor", power: c.power, x: b.pos.x, z: b.pos.z });
  else if (c.kind === "board" && c.power > 0.4) m.emit({ type: "board", power: Math.min(1, c.power / 5) });
  else if (c.kind === "rim" && c.power > 0.4 && b.rimCd <= 0) {
    b.rimCd = 0.1;
    if (b.shot) b.shot.touchedRim = true;
    m.emit({ type: "rim", power: Math.min(1, c.power / 4) });
  }
}

function unit(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

function followShot(m: Match, contacts: readonly Contact[], dt: number): void {
  const b = m.ball;
  const shot = b.shot!;
  shot.track.t += dt;
  if (noteContacts(shot.track, contacts) === "through") return drop(m);
  if (onTheRing(shot.flight) || !missed(shot.track, b)) return;
  b.mode = "loose";
  b.flightKind = null;
  shot.outcome = classify(shot.track);
  missShot(m);
}

/** Through the ring: the net, and the points if the ball was live. */
function drop(m: Match): void {
  const b = m.ball;
  const shot = b.shot!;
  b.mode = "loose";
  b.flightKind = null;
  shot.made = true;
  shot.outcome = classify(shot.track);
  m.emit({ type: "net", swish: shot.track.first === null });
  if (!shot.counted && (m.phase === "live" || shot.kind === "free")) scoreShot(m);
}

/** A rebound off the iron that drops in after all still counts, the first free throw included. */
function looseDrop(m: Match, contacts: readonly Contact[]): void {
  const shot = m.ball.shot;
  if (!shot || shot.counted || !contacts.some((c) => c.kind === "through")) return;
  if (m.phase !== "live" && shot.kind !== "free") return;
  shot.made = true;
  shot.track.made = true;
  shot.outcome = "roll";
  m.emit({ type: "net", swish: false });
  scoreShot(m);
}

/** A pass: caught or picked off on the way, or gone astray once it hits the floor or flies well past. */
function followPass(m: Match, contacts: readonly Contact[]): void {
  const b = m.ball;
  if (passCaught(m)) return;
  const aim = b.aim;
  // Flying away from where it was thrown, well past it: nobody was there to take it.
  const past = !!aim && (aim.x - b.pos.x) * b.vel.x + (aim.z - b.pos.z) * b.vel.z < 0 && Math.hypot(aim.x - b.pos.x, aim.z - b.pos.z) > 1.2;
  if (past || b.flightT > 3 || contacts.some((c) => c.kind !== "through")) {
    b.mode = "loose";
    b.flightKind = null;
    b.passTo = null;
    b.aim = null;
  }
}
