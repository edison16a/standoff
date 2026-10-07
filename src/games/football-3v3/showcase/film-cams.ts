import type { AthleteView, MatchView } from "../engine";
import { CEREMONY_SPOT } from "../engine/ceremony";
import { FIELD } from "../engine/field";
import type { Vec } from "../render/camera/shots";
import type { ShotCamera } from "./trailer";

/** A camera for one frame: where it stands, what it looks at, and the lens. */
export interface FilmCam {
  pos: Vec;
  look: Vec;
  fov: number;
}

/** The players the film follows, by id in the seeded game: the Storm's QB and the receiver he hits for the long touchdown. */
export const QB = 0;
export const CATCHER = 2;
/** Later the Storm's speedster catches one over the middle and the Blaze's corner wraps him up. */
export const JUKER = 1;
export const TACKLER = 7;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);

function who(view: MatchView, id: number): AthleteView {
  return view.athletes.find((a) => a.id === id) ?? view.athletes[0]!;
}

/** A flat unit vector, or the fallback when it is too short to trust. */
function flat(x: number, z: number, fallback = { x: 1, z: 0 }): { x: number; z: number } {
  const l = Math.hypot(x, z);
  return l > 0.2 ? { x: x / l, z: z / l } : fallback;
}

/** A point `ahead` along `dir`, `side` across it to the left and `up` high, from a spot on the ground. */
function around(at: { x: number; z: number }, dir: { x: number; z: number }, ahead: number, side: number, up: number): Vec {
  return { x: at.x + dir.x * ahead - dir.z * side, y: up, z: at.z + dir.z * ahead + dir.x * side };
}

/** The shot's first and last stills: a runner's line over the whole shot steers the camera, not his every step. */
export interface Span {
  first: MatchView;
  last: MatchView;
}

/** Which way a player goes over the shot, flat. Swerves and jukes inside it do not swing the camera. */
function course(span: Span, id: number): { x: number; z: number } {
  const a = who(span.first, id);
  const b = who(span.last, id);
  return flat(b.x - a.x, b.z - a.z, flat(a.vx, a.vz));
}

/**
 * The trailer's cameras. Most sit low, below the players' eyes, so they
 * stand tall against the stadium lights, and each creeps in over its
 * shot so even slow motion keeps moving.
 */
export function filmCam(camera: ShotCamera, view: MatchView, u: number, span: Span): FilmCam {
  const e = ease(u);
  switch (camera) {
    case "qbLow": {
      // In front and to the side of the QB as he winds up, looking up at him, the throw coming at us.
      const qb = who(view, QB);
      const dir = flat(who(view, CATCHER).x - qb.x, who(view, CATCHER).z - qb.z);
      return { pos: around(qb, dir, mix(3.0, 2.6, e), mix(-1.9, -1.5, e), 0.8), look: { x: qb.x, y: 1.2, z: qb.z }, fov: 42 };
    }
    case "spiral": {
      // Riding just behind and beside the ball, the receiver ahead in the distance.
      const b = view.ball;
      const dir = flat(b.vx, b.vz);
      return { pos: { ...around(b, dir, -1.7, 0.7, 0), y: b.y + 0.3 }, look: { ...around(b, dir, 6, 0, 0), y: Math.max(0.6, b.y - 0.9) }, fov: 40 };
    }
    case "catch": {
      // Low in front of the receiver, the ball dropping in over his shoulder.
      const r = who(view, CATCHER);
      const dir = course(span, CATCHER);
      return { pos: around(r, dir, 4.2, mix(1.6, 1.2, e), 0.7), look: { x: r.x, y: 1.5, z: r.z }, fov: 38 };
    }
    case "juke": {
      // Low at the side, tracking the runner as he steps round the tackler.
      const r = who(view, CATCHER);
      const dir = course(span, CATCHER);
      return { pos: around(r, dir, mix(2.5, 0.5, e), 4.8, 0.55), look: { x: r.x + dir.x * 0.8, y: 1.1, z: r.z + dir.z * 0.8 }, fov: 40 };
    }
    case "pylon": {
      // On the turf beside the pylon, the scorer racing at the lens and over the goal line.
      const r = who(view, CATCHER);
      const pylon = { x: FIELD.goalX, z: Math.sign(r.z || -1) * FIELD.halfWidth };
      const pos = { x: pylon.x + mix(2.6, 2.2, e), y: 0.32, z: pylon.z * 1.03 };
      // A long lens while he is far, opening up as he arrives, so he stays big in the frame.
      return { pos, look: { x: r.x, y: mix(1.05, 1.2, e), z: r.z }, fov: mix(22, 40, e) };
    }
    case "dance": {
      // Low in the end zone, the scorer celebrating against the painted end zone and the crowd.
      const r = who(view, CATCHER);
      // He dances facing the end line, so the camera stands deep in the end zone looking back at him.
      const dir = flat(1, -Math.sign(r.z || -1) * 0.6);
      return { pos: around(r, dir, mix(3.6, 3.1, e), mix(-0.6, -0.9, e), 0.6), look: { x: r.x, y: 1.25, z: r.z }, fov: 40 };
    }
    case "hit": {
      // Down on the turf just ahead of the runner, the tackler flying in from behind him.
      const r = who(view, JUKER);
      const t = who(view, TACKLER);
      const dir = course(span, JUKER);
      const mid = { x: (r.x + t.x) / 2, z: (r.z + t.z) / 2 };
      return { pos: around(mid, dir, mix(3.4, 2.8, e), mix(-3.2, -2.6, e), 0.5), look: { x: mid.x, y: 0.9, z: mid.z }, fov: 40 };
    }
    case "lift": {
      // Low in front of the captain, tilting up as the trophy goes over his head.
      const s = CEREMONY_SPOT;
      return { pos: { x: s.x + mix(1.2, 0.7, e), y: mix(1.1, 0.8, e), z: s.z + mix(4.6, 4.0, e) }, look: { x: s.x, y: mix(1.8, 2.3, e), z: s.z }, fov: 38 };
    }
  }
}
