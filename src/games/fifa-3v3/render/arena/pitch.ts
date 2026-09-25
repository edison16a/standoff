import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { grassGrain, turfTexture } from "./textures";

/**
 * The turf inside the boards, a strip of darker run off outside them,
 * and the concourse floor out to the stands.
 */
export function buildPitch(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const map = turfTexture();
  const grain = grassGrain();
  const L = PITCH.halfLength * 2;
  const W = PITCH.halfWidth * 2;
  grain.repeat.set(L * 1.5, W * 1.5);
  const turf = new THREE.Mesh(
    new THREE.PlaneGeometry(L, W),
    new THREE.MeshStandardMaterial({ map, bumpMap: grain, bumpScale: 0.6, roughness: 0.92, metalness: 0 }),
  );
  turf.rotation.x = -Math.PI / 2;
  turf.receiveShadow = true;

  const runOffGrain = grain.clone();
  runOffGrain.repeat.set(60, 45);
  const runOff = new THREE.Mesh(
    new THREE.PlaneGeometry(L + 16, W + 14),
    new THREE.MeshStandardMaterial({ color: "#1d5a26", bumpMap: runOffGrain, bumpScale: 0.5, roughness: 0.95 }),
  );
  runOff.rotation.x = -Math.PI / 2;
  runOff.position.y = -0.01;
  runOff.receiveShadow = true;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: "#15171d", roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  floor.receiveShadow = true;
  group.add(floor, runOff, turf);
  return {
    group,
    dispose() {
      for (const mesh of [turf, runOff, floor]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      map.dispose();
      grain.dispose();
      runOffGrain.dispose();
    },
  };
}
