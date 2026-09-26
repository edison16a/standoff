import * as THREE from "three";
import { BOARD_AT, chopperPose, flightFloor, HELIPAD } from "../engine/chopper";
import type { SurvivalGame } from "../engine/game";
import { checkpointDistance, fightFrame, pointAt } from "../engine/route";
import { CHOPPER_STAGE } from "../engine/stages";

export interface View {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const EYE = 1.65;
/** Where the team stands on the helipad while the chopper waits, in metres short of it. */
const DOOR = 8;

const ease = (t: number) => THREE.MathUtils.smoothstep(t, 0, 1);

/**
 * The view on the roof: watching the chopper circle and land, running to
 * its door, then riding it up off the roof.
 */
export function rooftopView(game: SurvivalGame, breathe: THREE.Vector3): View {
  const frame = fightFrame(CHOPPER_STAGE);
  const pose = chopperPose(game.phase, game.stage, game.cutscene, game.phaseTime);
  const standing = new THREE.Vector3(frame.origin.x, frame.origin.y + EYE, frame.origin.z).add(breathe);
  if (!pose) {
    const ahead = frame.place(14, 0);
    return { pos: standing, look: new THREE.Vector3(ahead.x, ahead.y + 1.5, ahead.z) };
  }
  const at = frame.place(pose.ahead, pose.side);
  const chopper = new THREE.Vector3(at.x, frame.origin.y + pose.up + 1, at.z);
  if (game.phase !== "cutscene") return { pos: standing, look: chopper };
  const t = game.phaseTime;
  if (!pose.aboard) {
    // Once it touches down, the team runs for the door.
    const run = frame.place(ease((t - 3) / (BOARD_AT - 3)) * (HELIPAD - DOOR), 0);
    return { pos: new THREE.Vector3(run.x, frame.origin.y + EYE, run.z).add(breathe), look: chopper };
  }
  // In the cabin, looking out over the roof as it drops away.
  const seat = frame.place(HELIPAD, 0);
  const out = frame.place(HELIPAD + 24, 0);
  const y = frame.origin.y + pose.up + EYE;
  return { pos: new THREE.Vector3(seat.x, y, seat.z), look: new THREE.Vector3(out.x, y - 3, out.z) };
}

/** Riding the chopper from the roof to the docks, looking down the way ahead. */
export function flightView(distance: number, time: number): View {
  const along = distance - checkpointDistance(CHOPPER_STAGE);
  const ground = pointAt(distance);
  const floor = flightFloor(along);
  // A gentle sway, the way a cabin rocks in the air.
  const pos = new THREE.Vector3(ground.x, floor + EYE + Math.sin(time * 1.3) * 0.08, ground.z);
  const ahead = pointAt(distance + 24);
  const look = new THREE.Vector3(ahead.x, Math.max(ahead.y + 1.5, floor + EYE - 4), ahead.z);
  return { pos, look };
}
