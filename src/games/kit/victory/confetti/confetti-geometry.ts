import * as THREE from "three";

/**
 * One confetti card: a small plane with a gentle curl along its length,
 * so light rolls across it as it tumbles instead of a flat blink. Sized
 * 1 by 1 and scaled per piece, so squares and long strips share it.
 */
export function curledCard(curl = 0.18): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, 6, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    position.setZ(i, curl * (x * x - 0.25));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Party colours that read well under warm stage light. */
export const PAPER_COLOURS = ["#ff3b5c", "#ffd23f", "#3ddc97", "#3aa0ff", "#b36bff", "#ff8a3d", "#ffffff"];
/** Foil: a few gold and silver pieces that flash as they turn. */
export const FOIL_COLOURS = ["#ffd46b", "#f2c14e", "#e6e9f0"];
