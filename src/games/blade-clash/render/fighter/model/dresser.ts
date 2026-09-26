import type * as THREE from "three";
import { MeshBuilder } from "../../kit/mesh-builder";
import type { BodyRig } from "../rig/body-rig";
import type { BoneName } from "../rig/skeleton";

/**
 * Collects each bone's parts while a character is dressed, then merges
 * them per bone and material, so a fighter built from hundreds of pieces
 * draws in a few dozen calls. Parts are modelled in the bone's own axes.
 */
export class Dresser {
  private readonly builders = new Map<BoneName, MeshBuilder>();
  /** Parts that keep their own mesh: a cape, a plume, a glowing blade. */
  private readonly loose: { bone: BoneName; object: THREE.Object3D }[] = [];

  on(bone: BoneName): MeshBuilder {
    let builder = this.builders.get(bone);
    if (!builder) {
      builder = new MeshBuilder();
      this.builders.set(bone, builder);
    }
    return builder;
  }

  attach(bone: BoneName, object: THREE.Object3D): void {
    this.loose.push({ bone, object });
  }

  finish(rig: BodyRig, shadows = true): void {
    for (const [bone, builder] of this.builders) {
      if (!builder.empty) rig.bones[bone].add(builder.build(`${bone}-parts`, shadows));
    }
    for (const { bone, object } of this.loose) rig.bones[bone].add(object);
    this.builders.clear();
    this.loose.length = 0;
  }
}
