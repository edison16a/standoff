import * as THREE from "three";
import { createMatch, type Entrant } from "../engine/match";
import { startPlay } from "../engine/rules";
import type { MatchState } from "../engine/types";
import type { Pose } from "./trailer-cams";

/**
 * A development view for looking at the players up close: every build
 * stood in a row on the halfway line facing the camera, the keepers and
 * the referee beside them, all standing still. Reached with `?lab` on
 * the showcase, which is itself development only.
 */

const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "playmaker", seat: null },
  { team: 0, build: "winger", seat: null },
  { team: 1, build: "defender", seat: null },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "allrounder", seat: null },
];

/** Metres between neighbours in the row. */
const GAP = 1.1;

export function labMatch(): MatchState {
  const state = createMatch(LINEUP, { seed: 7, replays: false, level: "training" });
  startPlay(state);
  state.athletes.forEach((a, i) => {
    a.pos = { x: (i - 2.5) * GAP, z: 0 };
    a.vel = { x: 0, z: 0 };
    // Facing +z, toward the camera.
    a.facing = Math.PI / 2;
  });
  state.keepers.forEach((k, i) => {
    k.pos = { x: (i === 0 ? -1 : 1) * 4.2, z: 0.2 };
    k.vel = { x: 0, z: 0 };
    k.facing = Math.PI / 2;
  });
  state.referee.pos = { x: 5.4, z: 0.4 };
  state.referee.facing = Math.PI / 2;
  state.ball.pos = { x: 0, y: 0.11, z: 1.4 };
  state.ball.vel = { x: 0, y: 0, z: 0 };
  return state;
}

/** The laps of lab-run.ts, from high in the stand. */
export const RUN_POSE: Pose = { pos: new THREE.Vector3(0, 11, 26), look: new THREE.Vector3(0, 0, 0), fov: 46 };

/** The whole row, from in front at eye height. */
export const LAB_POSE: Pose = { pos: new THREE.Vector3(0, 1.3, 8.5), look: new THREE.Vector3(0, 1.0, 0), fov: 50 };
