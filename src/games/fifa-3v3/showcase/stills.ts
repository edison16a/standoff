import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchState } from "../engine/types";
import { makeFilm, stepFilm } from "./trailer-films";
import type { Pose } from "./trailer-cams";

interface Still {
  /** The trailer match's second to freeze. */
  at: number;
  pose: Pose;
  /** Where the still's spotlights point. */
  subject: THREE.Vector3;
}

/**
 * The icon is the Striker at the top of his hop over the All Rounder's
 * slide, the ball at his feet, from down on the grass in front of him.
 * The poster is his strike from the edge of the box an instant after
 * the ball leaves his boot, the Winger sliding in too late, the goal
 * ahead.
 */
const STILLS: Record<Exclude<ShowcaseView, "loop">, Still> = {
  icon: {
    at: 66.27,
    pose: { pos: new THREE.Vector3(2.5, 0.32, -7.7), look: new THREE.Vector3(0.95, 0.8, -5.3), fov: 42 },
    subject: new THREE.Vector3(0.95, 0.8, -5.4),
  },
  poster: {
    at: 68.95,
    pose: { pos: new THREE.Vector3(10.2, 0.65, -5.4), look: new THREE.Vector3(18.5, 1.1, -1.6), fov: 44 },
    subject: new THREE.Vector3(13.1, 0.9, -3.2),
  },
};

/** The frozen match for a still, and its framing. */
export function stillScene(view: Exclude<ShowcaseView, "loop">): { state: MatchState } & Still {
  const still = STILLS[view];
  const state = makeFilm("match");
  while (state.time < still.at - 1e-6) stepFilm(state);
  return { state, ...still };
}
