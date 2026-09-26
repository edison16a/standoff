import * as THREE from "three";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";

const place = new THREE.Matrix4();
const part = new THREE.Matrix4();
const euler = new THREE.Euler();

/**
 * A panel of lames laced together the way samurai armour is made: `rows`
 * curved bands stacked down from `at`, covered in close silk lacing in
 * the player's colour, each band's top edge a strip of black lacquer.
 * Modelled facing +x, `width` across z and hanging `height` down y, then
 * turned by `rot`: a skirt plate, a shoulder plate or a throat guard.
 */
export function lamellar(b: MeshBuilder, plate: THREE.Material, lace: THREE.Material, width: number, height: number, rows: number, at: V3, rot: V3): void {
  place.makeRotationFromEuler(euler.set(rot[0], rot[1], rot[2])).setPosition(at[0], at[1], at[2]);
  const band = height / rows;
  const radius = width * 1.6;
  for (let i = 0; i < rows; i++) {
    const y = -band * (i + 0.5);
    // Each lower band sits a touch further out, so the panel flares like a real one.
    const out = i * 0.005;
    const lame = new THREE.CylinderGeometry(radius, radius, band * 0.96, 12, 1, true, Math.PI / 2 - 0.33, 0.66);
    lame.translate(-radius + 0.012 + out, 0, 0);
    b.addMatrix(lame, lace, part.makeTranslation(0, y, 0).premultiply(place));
    const edge = new THREE.CylinderGeometry(radius + 0.003, radius + 0.003, band * 0.22, 12, 1, true, Math.PI / 2 - 0.335, 0.67);
    edge.translate(-radius + 0.012 + out, 0, 0);
    b.addMatrix(edge, plate, part.makeTranslation(0, y + band * 0.37, 0).premultiply(place));
  }
}
