import type { HitPart } from "../../../engine/zombie-kinds";
import type { Rig } from "./rig";
import { soften, stepSpring, type Spring, type SpringTune } from "./spring";

/** One round arriving, seen from the zombie it hit. */
export interface HitBlow {
  /** The way the round was travelling, in the zombie's own frame: x to its left, z toward the team. */
  dirX: number;
  dirZ: number;
  /** Which side of the body it struck: +1 its left, -1 its right, 0 square in the middle. */
  side: number;
  /** How hard, from `hitWeight`. An AK round into a walker's chest is 1. */
  weight: number;
  part: HitPart;
}

/** A torso snaps back and settles in about half a second; a head faster; the feet take longer to recover. */
const TORSO: SpringTune = { stiffness: 120, damping: 13 };
const HEAD: SpringTune = { stiffness: 200, damping: 17 };
const ARM: SpringTune = { stiffness: 90, damping: 9 };
const KNEES: SpringTune = { stiffness: 70, damping: 12 };
const PUSH: SpringTune = { stiffness: 40, damping: 11 };

const spring = (): Spring => ({ x: 0, v: 0 });

/**
 * A zombie's reaction to the rounds hitting it, as damped springs laid
 * over whatever pose it is in. Each blow kicks them: the torso is shoved
 * back along the round's path and twisted by an off centre hit, a head
 * shot snaps the head back, the arms jerk, and a heavy hit buckles the
 * knees and pushes the whole body back a step. The springs then pull it
 * back to its walk. Heavy rounds and stacked buckshot kick hardest.
 */
export class HitReaction {
  private readonly lean = spring();
  private readonly sway = spring();
  private readonly twist = spring();
  private readonly nod = spring();
  private readonly tilt = spring();
  private readonly armL = spring();
  private readonly armR = spring();
  private readonly knees = spring();
  private readonly pushX = spring();
  private readonly pushZ = spring();
  private hits = 0;
  /** Every spring with its tuning, so a frame steps them without building lists. */
  private readonly springs: readonly (readonly [Spring, SpringTune])[] = [
    [this.lean, TORSO], [this.sway, TORSO], [this.twist, TORSO],
    [this.nod, HEAD], [this.tilt, HEAD],
    [this.armL, ARM], [this.armR, ARM],
    [this.knees, KNEES],
    [this.pushX, PUSH], [this.pushZ, PUSH],
  ];
  /** False once every spring is back at rest, so a zombie nobody shot costs nothing. */
  private moving = false;

  hit(blow: HitBlow): void {
    const w = blow.weight;
    // Positive when the round drives it back, away from the team.
    const along = -blow.dirZ;
    this.hits += 1;
    this.moving = true;
    this.lean.v += w * 9 * along;
    this.sway.v -= w * 6 * blow.dirX;
    this.twist.v += w * 6 * blow.side * along;
    if (blow.part === "head") {
      // The head whips back and rolls off to one side.
      const roll = blow.side !== 0 ? blow.side : this.hits % 2 ? 1 : -1;
      this.nod.v += w * 24;
      this.tilt.v += w * 14 * roll;
    } else {
      this.nod.v += w * 4;
    }
    const limb = blow.part === "limb";
    this.armL.v += w * (limb && blow.side > 0 ? 18 : 6);
    this.armR.v += w * (limb && blow.side < 0 ? 18 : 6);
    // Only a big hit buckles the legs: an AK round, or a load of buckshot landing together.
    this.knees.v += Math.max(0, w - 0.5) * 9;
    this.pushX.v += w * 1.1 * blow.dirX;
    this.pushZ.v += w * 1.1 * blow.dirZ;
  }

  step(dt: number): void {
    if (!this.moving) return;
    let moving = false;
    for (const [s, tune] of this.springs) {
      stepSpring(s, tune, dt);
      if (Math.abs(s.x) > 1e-4 || Math.abs(s.v) > 1e-3) moving = true;
      else s.x = s.v = 0;
    }
    this.moving = moving;
  }

  /** Adds the reaction onto the pose just set on the joints. */
  apply(rig: Rig): void {
    const b = rig.bones;
    b.spine.rotation.x -= soften(this.lean.x, 0.8);
    b.spine.rotation.z += soften(this.sway.x, 0.5);
    b.spine.rotation.y += soften(this.twist.x, 0.6);
    const nod = soften(this.nod.x, 1);
    b.neck.rotation.x -= nod * 0.3;
    b.head.rotation.x -= nod;
    b.head.rotation.z += soften(this.tilt.x, 0.7);
    const left = soften(this.armL.x, 1.2);
    const right = soften(this.armR.x, 1.2);
    b.shoulderL.rotation.x -= left;
    b.shoulderL.rotation.z += left * 0.35;
    b.elbowL.rotation.x -= left * 0.5;
    b.shoulderR.rotation.x -= right;
    b.shoulderR.rotation.z -= right * 0.35;
    b.elbowR.rotation.x -= right * 0.5;
    const buckle = soften(this.knees.x, 0.7);
    b.kneeL.rotation.x += buckle;
    b.kneeR.rotation.x += buckle;
    b.hipL.rotation.x -= buckle * 0.5;
    b.hipR.rotation.x -= buckle * 0.5;
    b.hips.position.y -= rig.dims.thigh * 0.3 * buckle;
  }

  /** How far the blows have shoved the body, in its own frame (x to its left, z toward the team). */
  shove(out: { x: number; z: number }): { x: number; z: number } {
    const x = this.pushX.x;
    const z = this.pushZ.x;
    const d = Math.hypot(x, z);
    const k = d > 1e-6 ? soften(d, 0.3) / d : 0;
    out.x = x * k;
    out.z = z * k;
    return out;
  }
}
