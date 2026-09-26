import * as THREE from "three";
import type { Athlete } from "../engine/types";
import { angleDiff, clamp } from "../engine/vec";
import type { AthleteModel } from "./models/athlete-model";

const v = new THREE.Vector3();
const q = new THREE.Quaternion();
const ahead = new THREE.Vector3();

/** A jump in position bigger than this in one frame is a reset, eased out rather than shown. */
const TELEPORT = 0.6;
/**
 * A turn faster than this, in radians a second, is the engine squaring
 * the body up at once for a pass, a steal or a drive at the rim. It is
 * eased over a few frames instead. A spin move peaks near 21, so it is
 * followed as it is.
 */
const SNAP_TURN = 30;
/** A foot this far above the other is off the floor, and keeps the angle the pose gives it. */
const LIFTED = 0.25;

/**
 * Where a player is drawn: on the engine's spot and facing, with resets
 * and sudden turns eased out, and the feet on the floor.
 */
export class Placement {
  private readonly slip = new THREE.Vector3();
  private readonly last = new THREE.Vector3();
  private yawSlip = 0;
  private lastYaw: number;
  private grounded = 1;

  constructor(a: Athlete) {
    this.last.set(a.x, a.y, a.z);
    this.lastYaw = a.yaw;
  }

  /** Puts the root on the engine's spot, facing its way plus the pose's own `spin`, as in a 360 dunk. */
  place(a: Athlete, root: THREE.Object3D, spin: number, dt: number): void {
    v.set(a.x, a.y, a.z);
    if (v.distanceTo(this.last) > TELEPORT) this.slip.add(this.last).sub(v);
    this.last.copy(v);
    this.slip.multiplyScalar(Math.exp(-dt * 7));
    root.position.copy(v).add(this.slip);
    const turn = angleDiff(this.lastYaw, a.yaw);
    // Kept within half a turn, so the body always turns the short way round.
    if (Math.abs(turn) > SNAP_TURN * Math.max(dt, 1e-3)) this.yawSlip = angleDiff(0, this.yawSlip - turn);
    this.lastYaw = a.yaw;
    this.yawSlip *= Math.exp(-dt * 14);
    root.rotation.y = a.yaw + this.yawSlip + spin;
  }

  /**
   * On the floor each ankle takes up the tilt of its shin, so the sole
   * lies flat, or tipped down by the pose's `toes` (a push off), and the
   * hips are raised or lowered so the lowest point of either sole meets
   * the court: a crouch never sinks a toe into it and no pose floats.
   * A foot up in the stride keeps the pose's angle. In the air nothing
   * changes.
   */
  plant(a: Athlete, model: AthleteModel, toes: { L: number; R: number }, dt: number): void {
    this.grounded += ((a.y < 0.01 ? 1 : 0) - this.grounded) * (1 - Math.exp(-dt * 25));
    if (this.grounded < 0.01) return;
    const { joints: j, dims: d } = model;
    j.root.updateMatrixWorld(true);
    const heightL = j.ankleL.getWorldPosition(v).y;
    const heightR = j.ankleR.getWorldPosition(v).y;
    const lowest = Math.min(heightL, heightR);
    for (const [ankle, height, toe] of [[j.ankleL, heightL, toes.L], [j.ankleR, heightR, toes.R]] as const) {
      const w = this.grounded * clamp(1 - (height - lowest) / LIFTED, 0, 1);
      if (w <= 0) continue;
      ahead.set(0, 0, 1).applyQuaternion(ankle.getWorldQuaternion(q));
      // Turning the ankle down by an angle tips the toe down by as much.
      ankle.rotation.x += (Math.asin(clamp(ahead.y, -1, 1)) + toe) * w;
    }
    j.root.updateMatrixWorld(true);
    let low = Infinity;
    for (const ankle of [j.ankleL, j.ankleR]) {
      for (const z of [d.sole.heel, d.sole.toe]) low = Math.min(low, ankle.localToWorld(v.set(0, d.sole.y, z)).y);
    }
    j.hips.position.y -= (low - j.root.position.y) * this.grounded;
  }
}
