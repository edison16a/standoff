import * as THREE from "three";

/** The lighting rig hangs this high over the canvas, this far out from the middle. */
export const TRUSS_Y = 6.2;
export const TRUSS_HALF = 3.6;

type Keep = <T extends { dispose(): void }>(thing: T) => T;

/**
 * The square truss over the ring, its lamp cans with their glowing faces,
 * and four soft shafts of light falling through the haze onto the canvas.
 * `keep` collects everything that must be disposed with the arena.
 */
export function buildTruss(glow: THREE.Texture, keep: Keep): { group: THREE.Group; shafts: THREE.Mesh[] } {
  const group = new THREE.Group();
  const shafts: THREE.Mesh[] = [];
  const metal = keep(new THREE.MeshStandardMaterial({ color: "#2a2c34", metalness: 0.8, roughness: 0.35 }));
  const beam = keep(new THREE.BoxGeometry(TRUSS_HALF * 2 + 0.3, 0.25, 0.25));
  for (let side = 0; side < 4; side++) {
    const piece = new THREE.Mesh(beam, metal);
    const angle = (side * Math.PI) / 2;
    piece.position.set(Math.sin(angle) * TRUSS_HALF, TRUSS_Y, Math.cos(angle) * TRUSS_HALF);
    piece.rotation.y = angle + Math.PI / 2;
    group.add(piece);
  }
  const can = keep(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 14));
  const lens = keep(new THREE.MeshBasicMaterial({ color: "#fff8e8", toneMapped: false }));
  const lensGeo = keep(new THREE.CircleGeometry(0.15, 16));
  const halo = keep(new THREE.SpriteMaterial({ map: glow, color: "#fff2d8", blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
  const shaftGeo = keep(new THREE.ConeGeometry(1.4, TRUSS_Y + 0.4, 24, 1, true));
  shaftGeo.translate(0, -(TRUSS_Y + 0.4) / 2, 0);
  for (let side = 0; side < 4; side++) {
    for (const along of [-2.2, -0.75, 0.75, 2.2]) {
      const angle = (side * Math.PI) / 2;
      const x = Math.sin(angle) * TRUSS_HALF + Math.cos(angle) * along;
      const z = Math.cos(angle) * TRUSS_HALF - Math.sin(angle) * along;
      const lamp = new THREE.Group();
      lamp.position.set(x, TRUSS_Y - 0.25, z);
      lamp.lookAt(x * 0.15, 0, z * 0.15);
      const body = new THREE.Mesh(can, metal);
      body.rotation.x = Math.PI / 2;
      const face = new THREE.Mesh(lensGeo, lens);
      face.position.z = 0.18;
      const sprite = new THREE.Sprite(halo);
      sprite.scale.setScalar(0.9);
      sprite.position.z = 0.2;
      lamp.add(body, face, sprite);
      group.add(lamp);
    }
  }
  // Four soft shafts of light falling through the haze onto the canvas.
  for (const [x, z] of [
    [-1, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
  ] as const) {
    const shaft = new THREE.Mesh(
      shaftGeo,
      keep(new THREE.MeshBasicMaterial({ color: "#fff1dc", transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
    );
    shaft.position.set(x * TRUSS_HALF, TRUSS_Y, z * TRUSS_HALF);
    // The cone's tip is at the lamp and its open base falls on the canvas near the middle.
    const down = new THREE.Vector3(-x * 0.6, 0, -z * 0.6).sub(shaft.position).normalize();
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
    shafts.push(shaft);
    group.add(shaft);
  }
  return { group, shafts };
}
