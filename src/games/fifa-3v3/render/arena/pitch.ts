import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { GRASS_TILE, grassTexture } from "./grass-texture";
import { turfMaterial } from "./turf-material";

/**
 * The turf out to the stands, in one draw: the mown pitch inside the
 * boards and the plainer run off round it (turf-material.ts), then the
 * concourse floor beyond.
 */
export function buildPitch(): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const grass = grassTexture();
  const w = PITCH.halfLength * 2 + 16;
  const d = PITCH.halfWidth * 2 + 14;
  const geometry = new THREE.PlaneGeometry(w, d);
  // UVs in grass tiles, so the bump repeats at the blades' own scale.
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / GRASS_TILE, (uv.getY(i) * d) / GRASS_TILE);
  const turf = new THREE.Mesh(geometry, turfMaterial(grass));
  turf.rotation.x = -Math.PI / 2;
  turf.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ color: "#15171d", roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  floor.receiveShadow = true;
  group.add(floor, turf);
  return {
    group,
    dispose() {
      for (const mesh of [turf, floor]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      grass.dispose();
    },
  };
}
