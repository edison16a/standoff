import * as THREE from "three";
import { makeZombie, type Zombie } from "../../engine/zombie";
import { poseZombie } from "../../render/models/zombies/animate";
import { buildCommoner } from "../../render/models/zombies/commoners";
import type { Rig } from "../../render/models/zombies/rig";
import { glowTexture } from "../../render/textures";
import { chaserAt, CHASERS } from "./story";

interface View {
  rig: Rig;
  /** A stand in for the engine's zombie, so the game's own animation poses it. */
  body: Zombie;
  shadow: THREE.Mesh;
  /** Metres covered per stride cycle, so the feet match the pace. */
  stride: number;
}

/**
 * The pack chasing the truck, drawn with the game's own runner models
 * and poses. Each frame places and poses every chaser from the story,
 * adds a pounce for the one leaping at the tailgate, and hides those
 * yet to burst out of their doorways.
 */
export class Horde {
  readonly group = new THREE.Group();
  private readonly views = new Map<number, View>();
  private readonly shadowGeo = new THREE.CircleGeometry(0.55, 16);
  private readonly shadowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });

  constructor() {
    for (const spec of CHASERS) {
      const rig = buildCommoner("runner", spec.seed, "town");
      const body = makeZombie(spec.id, "runner", 0, 0, 0, { hpScale: 1, speedScale: 1, harm: 1, weakHp: 0, seed: spec.seed });
      const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      this.group.add(rig.root, shadow);
      const reach = (rig.dims.thigh + rig.dims.shin) * Math.sin(0.78);
      this.views.set(spec.id, { rig, body, shadow, stride: 4 * reach });
    }
  }

  /** Places and poses the pack at story time `s`. `flinch` gives each chaser's latest hit, 0 to 1. */
  update(s: number, flinch: (id: number) => number): void {
    for (const spec of CHASERS) {
      const view = this.views.get(spec.id)!;
      const pose = chaserAt(spec, s);
      const { rig, body } = view;
      rig.root.visible = view.shadow.visible = pose.state !== "hidden";
      if (pose.state === "hidden") continue;
      rig.root.position.set(pose.x, pose.y, pose.z);
      rig.root.rotation.y = pose.heading;
      view.shadow.position.set(pose.x, 0.03, pose.z);
      body.state = pose.state === "dead" ? "dead" : "walk";
      body.stateTime = pose.time;
      body.age = s + spec.seed * 5;
      body.death = pose.state === "dead" ? { head: false, seat: 1 } : null;
      poseZombie(rig, body, flinch(spec.id), pose.run / view.stride);
      if (pose.state === "leap") pounce(rig, pose.time);
      // Shot out of the air, it keeps its pounce and is flung over backwards until it lands.
      if (spec.leap !== undefined && pose.state === "dead" && pose.y > 0) {
        pounce(rig, 1);
        rig.body.rotation.x = 0.5 - Math.min(1, pose.time / 0.3) * 1.9;
      }
      for (const eye of rig.eyes) eye.visible = pose.state !== "dead";
    }
  }

  /** World position of a chaser's chest, where shots land. */
  chest(id: number, out: THREE.Vector3): THREE.Vector3 {
    const view = this.views.get(id);
    if (!view) return out.set(0, 0, 0);
    return view.rig.bones.spine.localToWorld(out.set(0, view.rig.dims.torso * 0.6, 0));
  }

  dispose(): void {
    for (const view of this.views.values()) {
      view.rig.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
    this.shadowGeo.dispose();
    this.shadowMat.dispose();
  }
}

/** Arms thrown forward, legs tucked under, flying at the tailgate jaws first. */
function pounce(rig: Rig, time: number): void {
  const b = rig.bones;
  const k = Math.min(1, time / 0.25);
  rig.body.rotation.x = 0.5 * k;
  b.spine.rotation.x = 0.35 + 0.3 * k;
  b.head.rotation.x = -0.5 * k;
  b.jaw.rotation.x = 0.75;
  b.shoulderL.rotation.set(-1.4 * k - 0.3, 0, 0.35);
  b.shoulderR.rotation.set(-1.6 * k - 0.3, 0, -0.35);
  b.elbowL.rotation.x = b.elbowR.rotation.x = -0.35;
  b.hipL.rotation.set(-1.1 * k, 0, 0.1);
  b.hipR.rotation.set(0.4 * k, 0, -0.1);
  b.kneeL.rotation.x = 1.6 * k;
  b.kneeR.rotation.x = 1.2 * k;
}
