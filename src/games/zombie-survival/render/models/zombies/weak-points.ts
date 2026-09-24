import * as THREE from "three";
import type { Joint } from "../../../engine/zombie-kinds";
import { glowTexture } from "../../textures";
import type { Bone, Dresser, Rig } from "./rig";
import { zombieMaterials } from "./zombie-materials";

/** One glowing weak point: the swollen bulb, its halo and a ring, and the hit shape around it. */
export interface WeakMarker {
  index: number;
  bulb: THREE.Mesh;
  halo: THREE.Sprite;
  ring: THREE.Mesh;
  broken: boolean;
}

/**
 * Where each weak joint's bulb sits. Shoulders ride the chest rather
 * than the arm, so they stay facing the team however the arms swing.
 */
function place(joint: Joint, d: Rig["dims"], r: number): { bone: Bone; at: THREE.Vector3 } {
  const front = (depth: number) => depth / 2 + r * 0.35;
  if (joint === "chest") return { bone: "spine", at: new THREE.Vector3(0, d.torso * 0.6, front(d.torsoD)) };
  if (joint === "shoulderL" || joint === "shoulderR") {
    const side = joint === "shoulderL" ? 1 : -1;
    return { bone: "spine", at: new THREE.Vector3(side * d.shoulderW * 0.5, d.torso - d.arm * 0.6, front(Math.max(d.torsoD * 0.8, d.arm))) };
  }
  if (joint === "elbowL" || joint === "elbowR") return { bone: joint, at: new THREE.Vector3(0, 0, front(d.arm)) };
  return { bone: joint, at: new THREE.Vector3(0, 0, front(d.leg)) };
}

let ringGeo: THREE.TorusGeometry | null = null;
let bulbGeo: THREE.SphereGeometry | null = null;

/**
 * Puts a glowing bulb on each weak joint, on the front where the team
 * can see it. The hit shape is a little bigger than the bulb so a shot
 * that clearly touches the glow counts.
 */
export function addWeakPoints(rig: Rig, dress: Dresser, joints: readonly Joint[], radius: number): WeakMarker[] {
  const m = zombieMaterials();
  const d = rig.dims;
  ringGeo ??= new THREE.TorusGeometry(1, 0.08, 8, 28);
  bulbGeo ??= new THREE.SphereGeometry(1, 18, 12);
  return joints.map((joint, index) => {
    const { bone, at } = place(joint, d, radius);
    // Flesh swells round the bulb, so it reads as part of the body.
    dress.on(bone).sphere(radius * 1.35, m.gore, [at.x, at.y, at.z - radius * 0.35], [1, 1, 0.7], 12);
    const bulb = new THREE.Mesh(bulbGeo!, m.weak);
    bulb.scale.setScalar(radius);
    bulb.position.copy(at);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    halo.scale.setScalar(radius * 4.6);
    halo.position.copy(at);
    const ring = new THREE.Mesh(ringGeo!, new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    ring.scale.setScalar(radius * 1.55);
    ring.position.copy(at).add(new THREE.Vector3(0, 0, radius * 0.4));
    rig.bones[bone].add(bulb, halo, ring);
    const size = radius * 2.9;
    dress.proxy(bone, [size, size, size], [at.x, at.y, at.z], "weak", index);
    return { index, bulb, halo, ring, broken: false };
  });
}

/** Pulses the glow; broken points go dark and shrink. */
export function animateWeakPoints(markers: readonly WeakMarker[], weakHp: readonly number[], time: number): void {
  const m = zombieMaterials();
  for (const marker of markers) {
    const broken = (weakHp[marker.index] ?? 0) <= 0;
    if (broken && !marker.broken) {
      marker.broken = true;
      marker.bulb.material = m.weakDead;
      marker.bulb.scale.multiplyScalar(0.7);
      marker.halo.visible = false;
      marker.ring.visible = false;
    }
    if (marker.broken) continue;
    const pulse = 0.75 + Math.sin(time * 5 + marker.index * 1.7) * 0.25;
    (marker.halo.material as THREE.SpriteMaterial).opacity = pulse;
    marker.ring.rotation.z = time * 1.5 + marker.index;
    (marker.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.4;
  }
}
