import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchState } from "../engine/types";
import { ICON_RUN, iconMatch } from "./icon-film";
import { makeFilm, stepFilm } from "./trailer-films";
import type { Pose } from "./trailer-cams";

interface Still {
  /** The second to freeze: of the trailer match for the poster, of its own film (icon-film.ts) for the icon. */
  at: number;
  pose: Pose;
  /** Where the still's spotlights point. */
  subject: THREE.Vector3;
  /** The way the hero runs, for a still lit like a cover (iconLights); without it the stills' own lights. */
  facing?: { x: number; z: number };
  /** How near the haze starts, in metres: nearer sinks more of the stands. */
  haze: number;
}

/**
 * The icon is made like a game cover: the Striker alone, facing the
 * viewer as he winds up to shoot on the run, arms spread and his boot
 * drawn back over the ball, from low in front and to one side with the
 * lit stands behind. The poster is his strike from the edge of the box
 * an instant after the ball leaves his boot, spinning on its way to the
 * far corner, the goal ahead.
 */
const STILLS: Record<Exclude<ShowcaseView, "loop">, Still> = {
  icon: {
    at: 1.36,
    pose: { pos: new THREE.Vector3(11.07, 0.45, -1.33), look: new THREE.Vector3(8.88, 0.8, -3.81), fov: 44 },
    subject: new THREE.Vector3(8.78, 0.9, -3.81),
    facing: ICON_RUN.dir,
    haze: 18,
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
  if (view === "icon") return heroFramed(iconMatch(still.at), still);
  const state = makeFilm("match");
  while (state.time < still.at - 1e-6) stepFilm(state);
  return { state, ...still };
}

/**
 * The icon's framing follows the Striker: the shot is set up round where
 * he should be, and if the simulation carries him a little further or
 * shorter the camera, its target and the lights move with him.
 */
function heroFramed(state: MatchState, still: Still): { state: MatchState } & Still {
  const hero = state.athletes[0]!.pos;
  const shift = new THREE.Vector3(hero.x - still.subject.x, 0, hero.z - still.subject.z);
  const pose = { pos: still.pose.pos.clone().add(shift), look: still.pose.look.clone().add(shift), fov: still.pose.fov };
  return { state, ...still, pose, subject: still.subject.clone().add(shift) };
}
