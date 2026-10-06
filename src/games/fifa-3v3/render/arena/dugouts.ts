import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { merge, paint } from "../models/geo";

const LENGTH = 6;
const DEPTH = 1.6;
const HEIGHT = 2.1;

/**
 * The two dugouts across the pitch, between the boards and the main
 * stand: a concrete floor and back wall, a row of padded seats in each
 * team's colour, and a curved clear shell over them. Both dugouts are
 * two draws: the solid parts, and the clear shell.
 */
export function buildDugouts(teamColours: readonly [string, string]): { group: THREE.Group; dispose(): void } {
  const solid: THREE.BufferGeometry[] = [];
  const clear: THREE.BufferGeometry[] = [];
  const z = -(PITCH.halfWidth + 1.75);
  for (const [i, x] of [-7.5, 7.5].entries()) {
    const at = (g: THREE.BufferGeometry) => g.translate(x, 0, z);
    solid.push(at(paint(new THREE.BoxGeometry(LENGTH, 0.12, DEPTH), "#3b3e45", { at: [0, 0.06, 0] })));
    solid.push(at(paint(new THREE.BoxGeometry(LENGTH, HEIGHT, 0.12), "#25282f", { at: [0, HEIGHT / 2, -DEPTH / 2] })));
    for (let s = 0; s < 8; s++) {
      const sx = -LENGTH / 2 + 0.45 + s * ((LENGTH - 0.9) / 7);
      solid.push(at(paint(new THREE.BoxGeometry(0.5, 0.12, 0.5), teamColours[i]!, { at: [sx, 0.5, -DEPTH / 2 + 0.35] })));
      solid.push(at(paint(new THREE.BoxGeometry(0.5, 0.6, 0.1), teamColours[i]!, { at: [sx, 0.85, -DEPTH / 2 + 0.12] })));
      solid.push(at(paint(new THREE.BoxGeometry(0.06, 0.45, 0.06), "#7a7f88", { at: [sx, 0.22, -DEPTH / 2 + 0.35] })));
    }
    // The shell: a quarter tube from the top of the back wall down to the front, and its two ends.
    const shell = new THREE.CylinderGeometry(DEPTH, DEPTH, LENGTH, 16, 1, true, 0, Math.PI / 2);
    shell.rotateZ(Math.PI / 2);
    shell.scale(1, HEIGHT / DEPTH, 1);
    shell.translate(0, 0, -DEPTH / 2);
    clear.push(at(paint(shell, "#ffffff")));
    for (const side of [-1, 1]) {
      const end = new THREE.CircleGeometry(DEPTH, 12, 0, Math.PI / 2);
      end.rotateY(Math.PI / 2);
      end.scale(1, HEIGHT / DEPTH, 1);
      end.translate((side * LENGTH) / 2, 0, -DEPTH / 2);
      clear.push(at(paint(end, "#ffffff")));
    }
  }
  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const clearMat = new THREE.MeshStandardMaterial({ color: "#cfe3ff", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const body = new THREE.Mesh(merge(solid), solidMat);
  body.castShadow = body.receiveShadow = true;
  const glass = new THREE.Mesh(merge(clear), clearMat);
  glass.renderOrder = 3;
  const group = new THREE.Group();
  group.add(body, glass);
  return {
    group,
    dispose() {
      body.geometry.dispose();
      glass.geometry.dispose();
      solidMat.dispose();
      clearMat.dispose();
    },
  };
}
