import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchState } from "../engine/types";
import { makeFilm, STRIKER, stepFilm } from "./trailer-films";
import type { Pose } from "./trailer-cams";

interface Still {
  /** The second of the trailer match to freeze. */
  at: number;
  pose: Pose;
  /** Where the still's spotlights point. */
  subject: THREE.Vector3;
  /** The way the hero runs, for a still lit like a cover (iconLights); without it the stills' own lights. */
  facing?: { x: number; z: number };
  /** Players kept in the moment; anyone else this close to the hero is stepped back out of the frame. */
  cast?: readonly number[];
  /** How near the haze starts, in metres: nearer sinks more of the stands. */
  haze: number;
}

/**
 * The icon is made like a game cover: the Striker in the air over the
 * Winger's slide, the ball lifted over the boot with him, seen from down
 * on the grass in front as the slide comes at the camera. It is the
 * trailer's hurdle, held at the top of the hop. The poster is his strike
 * from the edge of the box an instant after the ball leaves his boot,
 * spinning on its way to the far corner, the goal ahead.
 */
const STILLS: Record<Exclude<ShowcaseView, "loop">, Still> = {
  icon: {
    at: 22.0,
    pose: { pos: new THREE.Vector3(5.6, 0.32, -1.9), look: new THREE.Vector3(4.1, 0.75, 1.6), fov: 50 },
    subject: new THREE.Vector3(4.05, 0.8, 1.6),
    facing: { x: 0.58, z: -0.81 },
    cast: [STRIKER, 5],
    haze: 22,
  },
  poster: {
    at: 24.15,
    pose: { pos: new THREE.Vector3(11.0, 0.6, 4.4), look: new THREE.Vector3(17.3, 1.0, -0.6), fov: 46 },
    subject: new THREE.Vector3(13.4, 0.9, 0.6),
    haze: 40,
  },
};

/** The frozen match for a still, and its framing. */
export function stillScene(view: Exclude<ShowcaseView, "loop">): { state: MatchState } & Still {
  const still = STILLS[view];
  const state = makeFilm("match");
  while (state.time < still.at - 1e-6) stepFilm(state);
  if (still.cast) clearStage(state, still.cast);
  return { state, ...still };
}

/** Bystanders near the hero half fill the edge of a square frame, so they are stepped back from him. */
function clearStage(state: MatchState, cast: readonly number[]): void {
  const hero = state.athletes[cast[0]!]!.pos;
  const bodies = [...state.athletes.filter((a) => !cast.includes(a.id)), state.referee];
  for (const b of bodies) {
    const dx = b.pos.x - hero.x;
    const dz = b.pos.z - hero.z;
    const d = Math.hypot(dx, dz);
    if (d > 0 && d < 6) b.pos = { x: hero.x + (dx / d) * 9, z: hero.z + (dz / d) * 9 };
  }
}
