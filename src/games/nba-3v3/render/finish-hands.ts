import * as THREE from "three";
import { handsOn } from "../engine/finish/ball-track";
import { DUNK_SPEC } from "../engine/finish/dunks";
import type { Athlete, Ball } from "../engine/types";
import { RIM } from "../engine/tuning";
import { reachArm, type ArmChain } from "./arm-ik";

type Side = "L" | "R";
type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/** Elbows out and down carrying the ball at the chest; out and a little forward reaching overhead. In the torso's frame. */
const LOW = { L: new THREE.Vector3(0.8, -0.6, -0.15), R: new THREE.Vector3(-0.8, -0.6, -0.15) };
const HIGH = { L: new THREE.Vector3(0.9, -0.15, 0.3), R: new THREE.Vector3(-0.9, -0.15, 0.3) };

const ballAt = new THREE.Vector3();
const left = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const toShoulder = new THREE.Vector3();
const target = new THREE.Vector3();
const side2 = new THREE.Vector3();
const pole = new THREE.Vector3();
const shoulder = new THREE.Vector3();

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

/**
 * The hands on the real ball through a layup or a dunk: both hands on
 * it through the gather, the finishing hand all the way to the release
 * or the slam, then the hand on the front of the ring (a touch, or a
 * hang with the arms taking the weight). The engine keeps the ball in
 * reach (`engine/finish/ball-track.ts`), so the arms always get there.
 */
export function finishHands(a: Athlete, ball: Ball | null, arms: Record<Side, ArmChain>, palm: THREE.Vector3): void {
  const act = a.action;
  if (act.kind !== "drive" || !ball) return;
  const main: Side = act.hand === 1 ? "R" : "L";
  const off: Side = main === "R" ? "L" : "R";
  left.set(Math.cos(a.yaw), 0, -Math.sin(a.yaw));
  if (!act.released && ball.holder === a.id) {
    const on = handsOn(act);
    ballAt.set(ball.pos.x, ball.pos.y, ball.pos.z);
    grip(arms[main], main, on.off, palm, 1);
    if (on.off > 0.01) grip(arms[off], off, 1, palm, on.off);
    return;
  }
  const since = act.t - act.finish;
  if (!act.dunk) {
    // The hand stays up where the ball left it a moment, then the follow through takes over.
    const w = 1 - smooth(since / 0.12);
    if (w <= 0) return;
    ballAt.set(act.release.x, act.release.y, act.release.z);
    grip(arms[main], main, 0, palm, w);
    return;
  }
  rimHands(act, arms, main, off, since, palm);
}

/** After the slam: the hands on the front of the ring for the hang, or a slap of the rim on the way down. */
function rimHands(act: Drive, arms: Record<Side, ArmChain>, main: Side, off: Side, since: number, palm: THREE.Vector3): void {
  const hang = act.rimHang;
  const w = hang > 0 ? smooth(since / 0.05) * (1 - smooth((since - hang) / 0.12)) : smooth(since / 0.04) * (1 - smooth((since - 0.08) / 0.14));
  if (w <= 0.001) return;
  // The near side of the ring, from the body.
  const bx = act.to.x - RIM.x;
  const bz = act.to.z - RIM.z;
  const l = Math.hypot(bx, bz) || 1;
  const two = DUNK_SPEC[act.style ?? "flush"].hands === 2 && hang > 0;
  for (const side of two ? [main, off] : [main]) {
    // Each hand round the front of the ring to its own side, palm over the tube.
    target.set(RIM.x + (bx / l) * RIM.radius, RIM.y + 0.04, RIM.z + (bz / l) * RIM.radius);
    if (two) target.addScaledVector(left, side === "L" ? 0.15 : -0.15);
    reachArm(arms[side], target, palm, HIGH[side], w);
  }
}

/**
 * One hand to the real ball: behind it from the shoulder when it is
 * alone on the ball, on its own side of it when both are (`two` 1), and
 * eased between the two as the other hand comes on or leaves.
 */
function grip(arm: ArmChain, side: Side, two: number, palm: THREE.Vector3, w: number): void {
  arm.shoulder.getWorldPosition(shoulder);
  target.copy(ballAt).addScaledVector(toShoulder.copy(shoulder).sub(ballAt).setY(0).normalize(), 0.1).addScaledVector(up, 0.05);
  side2.copy(ballAt).addScaledVector(left, side === "L" ? 0.125 : -0.125);
  target.lerp(side2, smooth(two));
  // Elbows down and out at the chest, out and forward overhead.
  const k = smooth((ballAt.y - shoulder.y + 0.25) / 0.5);
  pole.copy(LOW[side]).lerp(HIGH[side], k);
  reachArm(arm, target, palm, pole, w);
}
