import * as THREE from "three";
import { RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import { dir2 } from "../engine/vec";
import type { CinemaLook } from "../render/film-look";
import { HIGHLIGHT_LINEUP } from "./script";
import { iconLights } from "./still-lights";

const SHOOTER = 0;
const LOCKDOWN = 3;

/** When Shoot goes down, how long it is held (a green, short of gold), and when the defender jumps at it. */
const PRESS_AT = 0.4;
const HOLD_MS = GREEN_MS + 30;
const JUMP_AT = PRESS_AT + 0.3;

/** Seconds the icon's film runs before it is held: the wrist snapped through and the ball just clear of the fingers, over the defender's reach. */
export const ICON_AT = PRESS_AT + HOLD_MS / 1000 + 0.1;

/**
 * The Shooter on the left elbow, squared up to the rim. His man starts
 * just outside a stepback's reach on that line (stepback.ts), so the
 * jumper goes straight up, and closes out to `CLOSE` as the shot rises.
 */
const SPOT = { x: -2.5, z: 6.4 };
const TO_RIM = dir2(SPOT, RIM_SPOT);
const SIDE = { x: -TO_RIM.z, z: TO_RIM.x };
const GUARD = { x: SPOT.x + TO_RIM.x * 1.3, z: SPOT.z + TO_RIM.z * 1.3 };
const CLOSE = 0.95;
/** Where the camera sits from the Shooter, along his line to the rim and out to his left, and what it looks at. */
const at = (ahead: number, side: number, y: number) => new THREE.Vector3(SPOT.x + TO_RIM.x * ahead + SIDE.x * side, y, SPOT.z + TO_RIM.z * ahead + SIDE.z * side);

/**
 * On the floor off the Shooter's front, out to the side of his man,
 * looking up past them into the ring of arena lights: his face in three
 * quarter view as he rises, the ball just off his fingers, and the
 * defender in the air beside it, reaching for it.
 */
export const ICON_CAMERA = { pos: at(1.5, 1.55, 0.35), look: at(0.5, 0, 2.25), fov: 54 };

/** The lights aim at the ball between the two, keyed from the camera's side so both faces catch it. */
const SUBJECT = at(0.45, 0, 2.5);
const TO_CAMERA = { x: ICON_CAMERA.pos.x - SUBJECT.x, z: ICON_CAMERA.pos.z - SUBJECT.z };
const KEY_FROM = { x: TO_CAMERA.x / Math.hypot(TO_CAMERA.x, TO_CAMERA.z), z: TO_CAMERA.z / Math.hypot(TO_CAMERA.x, TO_CAMERA.z) };

/** A darker arena than the game's, so the lit pair stands out of it. */
export function iconLook(): CinemaLook {
  return { lights: iconLights(SUBJECT, KEY_FROM), fill: 0.4, key: 0.75, haze: 0.016, boards: true };
}

/** Where the six stand: the pair at the elbow, everyone else back in the dark, out of the shot. */
const START: readonly [number, number, number][] = [
  [SHOOTER, SPOT.x, SPOT.z],
  [1, 5.8, 9.6],
  [2, 6.2, 3.2],
  [LOCKDOWN, GUARD.x, GUARD.z],
  [4, 5.2, 10.4],
  [5, 6.8, 4.4],
];

/**
 * The icon's film, made like a cover shot: the Shooter rises into a
 * jumper at the elbow and the Lockdown defender leaps at it from a step
 * in front, both arms up. It is held as the ball leaves his fingers,
 * the defender's hand reaching for it. The block is forced to fall
 * short, so the film never depends on a roll of the dice.
 */
export class IconFilm {
  readonly match: Match;
  private readonly done = new Set<string>();

  constructor() {
    this.match = new Match({ seed: 4, firstOffence: 0, entries: [...HIGHLIGHT_LINEUP] });
    const m = this.match;
    m.checkBeat = false;
    m.phase = "live";
    for (const [id, x, z] of START) Object.assign(m.athletes[id]!, { x, z, yaw: 0 });
    m.ball.holder = SHOOTER;
    m.brains.reset();
    for (const a of m.athletes) a.auto = false;
  }

  steer(t: number): void {
    const m = this.match;
    for (const a of m.athletes) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.move = { x: 0, z: 0 };
    }
    for (const a of m.athletes) if (a.id !== LOCKDOWN) a.blockCd = Math.max(a.blockCd, 0.5);
    if (this.once("set")) {
      m.forced = "swish";
      m.forcedHit = "miss";
    }
    if (t > PRESS_AT && this.once("shoot")) m.press(SHOOTER, "shoot");
    // The close out: a hard step at the shooter once he has risen, then up.
    const d = m.athletes[LOCKDOWN]!;
    const s = m.athletes[SHOOTER]!;
    if (t > PRESS_AT && t < JUMP_AT && Math.hypot(d.x - s.x, d.z - s.z) > CLOSE) d.move = dir2(d, s);
    // On defence Pass is Block.
    if (t > JUMP_AT && this.once("jump")) m.press(LOCKDOWN, "pass");
    if (t > PRESS_AT + HOLD_MS / 1000 && this.once("release")) m.release(SHOOTER, HOLD_MS);
  }

  private once(key: string): boolean {
    if (this.done.has(key)) return false;
    this.done.add(key);
    return true;
  }

  slowFor(e: MatchEvent): null {
    void e;
    return null;
  }
}
