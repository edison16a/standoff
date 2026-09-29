import * as THREE from "three";
import { merged, plate, roundedRect, star } from "./shapes";

/** The finishes a belt's plates are made from. */
export interface PlateMaterials {
  gold: THREE.Material;
  satin: THREE.Material;
  enamel: THREE.Material;
  banner: THREE.Material;
  gems: readonly THREE.Material[];
}

/** A cut stone: a low crown over a pointed pavilion, flat shaded so every facet flashes. Faces +z. */
export function gemGeometry(radius: number): THREE.BufferGeometry {
  const crown = new THREE.CylinderGeometry(radius * 0.55, radius, radius * 0.35, 8, 1);
  crown.translate(0, radius * 0.175, 0);
  const pavilion = new THREE.ConeGeometry(radius, radius * 0.7, 8, 1);
  pavilion.rotateX(Math.PI);
  pavilion.translate(0, -radius * 0.35, 0);
  const gem = merged([crown, pavilion]);
  gem.rotateX(Math.PI / 2);
  return gem;
}

/** The oval outline of the big centre plate, with a crest rising from its top. */
function centreOutline(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  shape.moveTo(0, -h);
  shape.bezierCurveTo(w * 0.75, -h, w, -h * 0.55, w, 0);
  shape.bezierCurveTo(w, h * 0.55, w * 0.7, h * 0.92, w * 0.28, h * 0.95);
  // A three point crest over the middle.
  shape.lineTo(w * 0.2, h * 1.12);
  shape.lineTo(w * 0.1, h * 1.02);
  shape.lineTo(0, h * 1.22);
  shape.lineTo(-w * 0.1, h * 1.02);
  shape.lineTo(-w * 0.2, h * 1.12);
  shape.lineTo(-w * 0.28, h * 0.95);
  shape.bezierCurveTo(-w * 0.7, h * 0.92, -w, h * 0.55, -w, 0);
  shape.bezierCurveTo(-w, -h * 0.55, -w * 0.75, -h, 0, -h);
  return shape;
}

/**
 * The big centre plate: a crested oval of polished gold on a satin back
 * plate, a raised medallion inside a coloured enamel ring with a star,
 * a banner with the title, and a ring of gems round the edge. Its back
 * sits on z 0 and it faces +z.
 */
export function centrePlate(m: PlateMaterials, width = 0.34, height = 0.27): THREE.Group {
  const group = new THREE.Group();
  const back = new THREE.Mesh(plate(centreOutline(width * 1.06, height * 1.06), 0.006, 0.003), m.satin);
  group.add(back);
  const front = new THREE.Mesh(plate(centreOutline(width, height), 0.01, 0.005), m.gold);
  front.position.z = 0.006;
  group.add(front);
  const face = 0.024;
  // The enamel ring and the raised medallion inside it.
  const ring = new THREE.Shape();
  ring.absarc(0, 0, height * 0.36, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, height * 0.27, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  const enamel = new THREE.Mesh(plate(ring, 0.004, 0.0015), m.enamel);
  enamel.position.set(0, height * 0.06, face);
  group.add(enamel);
  const disc = new THREE.Shape();
  disc.absarc(0, 0, height * 0.265, 0, Math.PI * 2, false);
  const medallion = new THREE.Mesh(plate(disc, 0.008, 0.004), m.gold);
  medallion.position.set(0, height * 0.06, face);
  group.add(medallion);
  const starMesh = new THREE.Mesh(plate(star(height * 0.2, height * 0.085), 0.006, 0.003), m.satin);
  starMesh.position.set(0, height * 0.06, face + 0.01);
  group.add(starMesh);
  // The banner across the bottom of the medallion, with the title.
  const banner = new THREE.Mesh(plate(roundedRect(width * 0.62, height * 0.17, 0.01), 0.004, 0.002), m.gold);
  banner.position.set(0, -height * 0.3, face);
  group.add(banner);
  const words = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.58, height * 0.14), m.banner);
  words.position.set(0, -height * 0.3, face + 0.0065);
  group.add(words);
  // Gems round the edge, alternating colours, and a big one in the crest.
  const gem = gemGeometry(0.0095);
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / count) * Math.PI * 2;
    // Skip the top, where the crest is.
    if (Math.abs(a - Math.PI / 2) < 0.3) continue;
    const mesh = new THREE.Mesh(gem, m.gems[i % m.gems.length]);
    mesh.position.set(Math.cos(a) * width * 0.43, Math.sin(a) * height * 0.4, 0.02);
    group.add(mesh);
  }
  const crest = new THREE.Mesh(gemGeometry(0.014), m.gems[0]);
  crest.position.set(0, height * 0.5, 0.02);
  group.add(crest);
  return group;
}

/** A smaller side plate: a rounded gold tablet with a border and a stone. Back on z 0, faces +z. */
export function sidePlate(m: PlateMaterials, width: number, height: number, gemIndex: number): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(plate(roundedRect(width, height, width * 0.2), 0.006, 0.003), m.gold));
  const inner = new THREE.Mesh(plate(roundedRect(width * 0.72, height * 0.72, width * 0.14), 0.003, 0.0015), m.satin);
  inner.position.z = 0.009;
  group.add(inner);
  const gem = new THREE.Mesh(gemGeometry(width * 0.2), m.gems[gemIndex % m.gems.length]);
  gem.position.z = 0.016;
  group.add(gem);
  return group;
}
