import * as THREE from "three";

/*
 * Flat outlines for the projectiles that are not round, one unit tall
 * and facing +x, built once and shared by every pooled projectile.
 */

/** A crescent moon: the flying slash that leaves the blade, its bulge leading. */
export function crescentGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    const p: [number, number] = [Math.cos(a) * 0.36, Math.sin(a) * 0.5];
    if (i === 0) s.moveTo(...p);
    else s.lineTo(...p);
  }
  for (let i = n; i >= 0; i--) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    s.lineTo(Math.cos(a) * 0.12 - 0.06, Math.sin(a) * 0.44);
  }
  return new THREE.ShapeGeometry(s);
}

/** A breaking wave crest standing on the floor, steep at the front, running along +x. */
export function waveGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.9, 0);
  s.quadraticCurveTo(-0.3, 0.15, 0.05, 0.85);
  s.lineTo(0.18, 1);
  s.quadraticCurveTo(0.3, 0.55, 0.45, 0);
  s.lineTo(-0.9, 0);
  return new THREE.ShapeGeometry(s);
}

/** A five point star. */
export function starGeometry(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22;
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(s);
}

/** A glowing additive material, tinted per projectile. */
export function glowing(colour: THREE.ColorRepresentation, opacity = 1, map: THREE.Texture | null = null): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: colour, map, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
}
