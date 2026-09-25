import { BONES, type Bone, type Rig } from "../models/rig";

/**
 * A pose as plain numbers: each bone's turn in x, y and z, plus how far
 * the body's middle rises or sinks. Poses are built fresh each frame and
 * eased toward, so a run turns into a jump or a roll without a snap.
 *
 * Arms and legs hang down from their joints, so a positive x turn swings
 * them forward. The spine points up, so a negative x turn bends it forward.
 */
export class Pose {
  readonly angles = new Float32Array(BONES.length * 3);
  lift = 0;

  set(bone: Bone, x: number, y = 0, z = 0): this {
    const i = INDEX[bone] * 3;
    this.angles[i] = x;
    this.angles[i + 1] = y;
    this.angles[i + 2] = z;
    return this;
  }

  add(bone: Bone, x: number, y = 0, z = 0): this {
    const i = INDEX[bone] * 3;
    this.angles[i]! += x;
    this.angles[i + 1]! += y;
    this.angles[i + 2]! += z;
    return this;
  }

  clear(): this {
    this.angles.fill(0);
    this.lift = 0;
    return this;
  }

  copy(other: Pose): this {
    this.angles.set(other.angles);
    this.lift = other.lift;
    return this;
  }

  /** Mixes `share` of another pose into this one. */
  blend(other: Pose, share: number): this {
    if (share <= 0) return this;
    for (let i = 0; i < this.angles.length; i++) this.angles[i]! += (other.angles[i]! - this.angles[i]!) * share;
    this.lift += (other.lift - this.lift) * share;
    return this;
  }

  /** Eases toward a target at `rate` per second. */
  approach(target: Pose, rate: number, dt: number): this {
    return this.blend(target, 1 - Math.exp(-rate * dt));
  }

  /** Lays the pose onto the rig's joints. */
  apply(rig: Rig): void {
    for (let b = 0; b < BONES.length; b++) {
      const i = b * 3;
      rig.bones[BONES[b]!].rotation.set(this.angles[i]!, this.angles[i + 1]!, this.angles[i + 2]!);
    }
    rig.pivot.position.y = rig.hipHeight * 0.75 + this.lift;
  }
}

const INDEX = Object.fromEntries(BONES.map((bone, i) => [bone, i])) as Record<Bone, number>;
