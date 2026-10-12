import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import type { GunMaterials } from "./gun-kit";

/**
 * Names of the moving parts beyond the GunModel's own fields. The gun rig
 * finds them by name, the way it would in a loaded model, so adding a
 * part never changes the model's shape for the phone viewer or the
 * showcase, which only show the gun at rest.
 */
export const PART = {
  /** The bolt or carrier showing in the ejection port. The rig shortens it toward the rear to open the port. */
  portSlide: "port-slide",
  /** The AR's dust cover, hinged along its lower edge. */
  portCover: "port-cover",
  /** A fresh magazine the support hand brings up, hidden at the magazine's home until then. */
  spareMagazine: "spare-magazine",
} as const;

/**
 * A bright bolt face filling the ejection port. It is built forward of its
 * origin, which sits at the rear edge of the port, so scaling it along z
 * opens the port from the front, as a bolt running back does.
 */
export function portSlide(m: GunMaterials, x: number, y: number, rearZ: number, height: number, length: number): THREE.Group {
  const b = new MeshBuilder();
  b.box(0.0012, height, length, m.steel, [0, 0, -length / 2]);
  // A sliver of the bolt's lug, so it reads as a part and not a sticker.
  b.box(0.0016, height * 0.3, length * 0.18, m.metal, [0.0002, -height * 0.2, -length * 0.82]);
  const slide = b.build(PART.portSlide);
  slide.position.set(x, y, rearZ);
  return slide;
}

/**
 * A spare built from the same recipe as the gun's own magazine, parked
 * hidden at the magazine's home so it never widens the gun's bounds.
 */
export function spareOf(magazine: THREE.Object3D, build: () => THREE.Group): THREE.Group {
  const spare = build();
  spare.name = PART.spareMagazine;
  spare.position.copy(magazine.position);
  spare.visible = false;
  return spare;
}
