import * as THREE from "three";
import type { Match } from "../../engine/match";
import { RULES } from "../../engine/rules";
import { buildReferee } from "../models/referee-model";
import { BoxerRig } from "../rig/boxer-rig";
import { stance, type RigPose } from "../rig/pose";
import { FootPlanner, STANCE_FEET } from "./feet";
import { Spring, SpringVector } from "./springs";

/** Where the referee keeps to: this far off the line between the boxers, and never nearer the ropes than this. */
const STAND_OFF = 1.9;
const ROOM = 2.1;
const WALK = 1.8;

/**
 * The referee: keeps to the side of the action as the boxers circle,
 * walks over to a boxer who goes down, leans over them and counts with
 * a chop of the arm on every number, and steps back when they rise.
 */
export class RefereeAnimator {
  readonly model = buildReferee();
  private readonly rig = new BoxerRig(this.model);
  private readonly pose: RigPose = stance();
  private readonly feet = new FootPlanner();
  private readonly spot = new THREE.Vector3(0, 0, STAND_OFF);
  private readonly goal = new THREE.Vector3();
  private readonly look = new SpringVector();
  private readonly bend = new Spring();
  private readonly count = new Spring();
  /** Which side of the pair he keeps to. The broadcast shots look from the other side, so he never blocks them. */
  private side = -1;
  private snapNext = true;

  update(match: Match, time: number, dt: number): void {
    const [a, b] = match.footwork.spots;
    const downId = match.fighters.findIndex((f) => f.down);
    const down = downId >= 0 ? match.fighters[downId]!.down : null;
    const counting = !!down && down.risingAt === null && match.phase !== "over";
    if (counting) {
      // Beside the fallen boxer, on the side toward the middle of the ring.
      const at = match.footwork.spots[downId as 0 | 1];
      const toMiddle = new THREE.Vector2(-at.x, -at.z);
      if (toMiddle.lengthSq() < 0.01) toMiddle.set(1, 0);
      toMiddle.normalize().multiplyScalar(0.75);
      this.goal.set(at.x + toMiddle.x, 0, at.z + toMiddle.y);
    } else {
      // Off to one side of the pair, staying on the same side unless the ropes force a switch.
      const mx = (a.x + b.x) / 2;
      const mz = (a.z + b.z) / 2;
      const along = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      const px = mx + Math.sin(along) * STAND_OFF * this.side;
      const pz = mz + Math.cos(along) * STAND_OFF * this.side;
      if (Math.max(Math.abs(px), Math.abs(pz)) > ROOM + 0.4) this.side = -this.side;
      this.goal.set(clamp(px, ROOM), 0, clamp(pz, ROOM));
    }
    if (this.snapNext) {
      // A fresh fight: straight to his place, rather than walking through the boxers to it.
      this.snapNext = false;
      this.spot.copy(this.goal);
      this.feet.reset();
    }
    const step = this.goal.clone().sub(this.spot);
    const gap = step.length();
    if (gap > 0.02) this.spot.addScaledVector(step, Math.min(1, (WALK * dt) / gap));

    // Faces the fallen boxer, or the middle of the action.
    const target = counting ? match.footwork.spots[downId as 0 | 1] : { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const facing = this.look.update(new THREE.Vector3(target.x - this.spot.x, 0, target.z - this.spot.z).normalize(), dt, 2);
    const yaw = Math.atan2(facing.x, facing.z);
    const bend = this.bend.update(counting ? 1 : 0, dt, 1.5);
    // The count: the arm rises through each second and chops down on the number.
    let chop = 0;
    if (counting && down) chop = 1 - Math.max(0, Math.min(1, (down.nextCountAt - match.now) / RULES.countMs));
    const arm = this.count.update(counting ? chop : 0, dt, 6);

    const p = this.pose;
    p.x = this.spot.x;
    p.z = this.spot.z;
    p.yaw = yaw;
    p.hipHeight = 0.94 - 0.08 * bend + 0.006 * Math.sin(time * 2.1);
    p.hips.pitch = 0.02 + 0.15 * bend;
    p.hips.yaw = 0;
    p.spine.pitch = 0.04 + 0.28 * bend;
    p.chest.pitch = 0.02 + 0.12 * bend;
    p.spine.yaw = p.chest.yaw = 0;
    p.spine.lean = p.chest.lean = 0;
    p.head.pitch = 0.1 + 0.3 * bend;
    p.head.yaw = 0.15 * Math.sin(time * 0.6);
    this.rig.applyBody(p);
    p.hands.left.target.set(0.24, 0.86 + 0.1 * bend, 0.08 + 0.1 * bend);
    p.hands.left.pole.set(0.6, 1.1, -0.4);
    // Up by the head at the start of each second, down in front on the count.
    p.hands.right.target.set(-0.22, 0.86 + (1.75 - 0.86) * (1 - arm) * bend, 0.1 + 0.45 * bend);
    p.hands.right.pole.set(-0.7, 1.1, -0.3);
    const world = this.feet.update(p.x, p.z, yaw, this.model.look.height, dt);
    for (const hand of ["left", "right"] as const) {
      this.rig.worldToModel(world[hand], p.feet[hand].position);
      p.feet[hand].position.y += 0.075;
      p.feet[hand].yaw = STANCE_FEET[hand].yaw * 0.4;
      p.gloveRoll[hand] = 0.3;
    }
    this.rig.applyLimbs(p);
  }

  /** Puts him straight in his place on the next frame, for a new fight. */
  reset(): void {
    this.snapNext = true;
  }

  dispose(): void {
    const materials = new Set<THREE.Material>();
    this.model.root.traverse((o) => {
      if (o instanceof THREE.Mesh) materials.add(o.material as THREE.Material);
    });
    this.model.dispose();
    for (const m of materials) m.dispose();
  }
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
