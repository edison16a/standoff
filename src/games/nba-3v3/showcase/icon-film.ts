import * as THREE from "three";
import { RIM_SPOT } from "../engine/court";
import type { MatchEvent } from "../engine/events";
import { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";
import type { CinemaLook } from "../render/film-look";
import { HIGHLIGHT_LINEUP } from "./script";
import { iconLights } from "./still-lights";

/** Seconds the icon's film runs before it is held: the Dunker in full stride, the ball in his hand. */
export const ICON_AT = 1.32;

/** Where he is then, and the way he runs: from the left wing straight at the rim. */
const SUBJECT = new THREE.Vector3(-2.13, 1.4, 4.46);
const FACING = { x: 0.596, z: -0.803 };

/** Low on his line, a few steps ahead of him, so he drives right at the viewer with the side stands behind. */
export const ICON_CAMERA = {
  pos: new THREE.Vector3(SUBJECT.x + FACING.x * 2.25, 0.45, SUBJECT.z + FACING.z * 2.25),
  look: new THREE.Vector3(SUBJECT.x, 1.1, SUBJECT.z),
  fov: 44,
};

/** A darker arena than the game's, so the lit hero stands out of it. */
export function iconLook(): CinemaLook {
  return { lights: iconLights(SUBJECT, FACING), fill: 0.3, key: 0.6, haze: 0.025 };
}

const DUNKER = 1;
const LOCKDOWN = 3;

/** Where the six stand as the drive starts: the Dunker on the left wing, his man a step behind, the rest wide. */
const START: readonly [number, number, number][] = [
  [0, 6.4, 6.5],
  [DUNKER, -5.2, 8.6],
  [2, 6.6, 4.2],
  [LOCKDOWN, -6.2, 9.4],
  [4, 2.6, 10.2],
  [5, 6.2, 8.8],
];

/**
 * The icon's film, made like a cover shot: the Dunker attacks the rim
 * from the wing at full speed with the ball, so a camera low on his line
 * sees him head on, driving at the viewer, with the side stands behind.
 * His defender chases a step behind; nobody else is near. It is held
 * mid stride, the ball in his hand, well before he takes off.
 */
export class IconFilm {
  readonly match: Match;

  constructor() {
    this.match = new Match({ seed: 4, firstOffence: 0, entries: [...HIGHLIGHT_LINEUP] });
    const m = this.match;
    m.checkBeat = false;
    m.phase = "live";
    for (const [id, x, z] of START) Object.assign(m.athletes[id]!, { x, z, yaw: 0 });
    m.ball.holder = DUNKER;
    m.brains.reset();
    for (const a of m.athletes) a.auto = false;
  }

  steer(): void {
    const m = this.match;
    for (const a of m.athletes) {
      a.stealCd = Math.max(a.stealCd, 0.5);
      a.blockCd = Math.max(a.blockCd, 0.5);
      a.move = { x: 0, z: 0 };
    }
    const dunker = m.athletes[DUNKER]!;
    dunker.move = toward(dunker, RIM_SPOT, 1);
    // The defender chases on the Dunker's shoulder, never quite level.
    const lock = m.athletes[LOCKDOWN]!;
    lock.move = toward(lock, { x: dunker.x, z: dunker.z + 1.5 }, 1);
  }

  slowFor(e: MatchEvent): null {
    void e;
    return null;
  }
}

function toward(a: Athlete, spot: V2, pace: number): V2 {
  const d = dir2(a, spot);
  return { x: d.x * pace, z: d.z * pace };
}
