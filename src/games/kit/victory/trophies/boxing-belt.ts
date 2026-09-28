import * as THREE from "three";
import { bannerTexture, leatherTexture } from "./belt-textures";
import { gem, metal, satinMetal } from "./materials";
import { add } from "./shapes";

export interface BeltOptions {
  /** The leather's colour. */
  strap?: string;
  /** The enamel behind the star and the lettering. */
  enamel?: string;
  /** Gem colours, used round the plate in turn. */
  gems?: readonly string[];
  /** Lettering on the banner under the medallion. */
  title?: string;
  /** How much the strap curls back: 0 flat, 1 closed round a waist. */
  bend?: number;
}

const LENGTH = 1.1;
const WIDTH = 0.13;
const THICK = 0.012;

/**
 * A boxing championship belt: a stitched leather strap with a big gold
 * centre plate (a scalloped shield with a crown, a star on enamel ringed
 * by gems, and a lettered banner) and gold side plates each set with a
 * gem. The strap runs along x with the plate facing +z and the origin at
 * the plate's middle. `userData.grips` has the two points a winner
 * holds it by, for lifting it overhead.
 */
export function createBoxingBelt(options: BeltOptions = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "boxing-belt";
  const bend = Math.max(0.001, options.bend ?? 0.12);
  const radius = LENGTH / (Math.PI * 2 * bend);
  const place = (x: number, z: number) => {
    const angle = x / radius;
    return { position: new THREE.Vector3((radius + z) * Math.sin(angle), 0, (radius + z) * Math.cos(angle) - radius), angle };
  };
  const gold = metal("gold", 0.16);
  const satin = satinMetal("gold");
  const gems = (options.gems ?? ["#e0112b", "#1b5cff", "#f4f7ff"]).map((c) => gem(c));
  addStrap(group, options.strap ?? "#141418", place);
  addPlate(group, gold, satin, gems, options.enamel ?? "#8e0f1c", options.title ?? "CHAMPION");
  for (const x of [-0.37, -0.24, 0.24, 0.37]) {
    const { position, angle } = place(x, THICK / 2);
    const plate = sidePlate(gold, satin, gems[Math.abs(Math.round(x * 10)) % gems.length]!);
    plate.position.copy(position);
    plate.rotation.y = angle;
    group.add(plate);
  }
  group.userData.grips = [place(-0.305, 0).position, place(0.305, 0).position];
  group.userData.span = LENGTH;
  return group;
}

function addStrap(group: THREE.Group, colour: string, place: (x: number, z: number) => { position: THREE.Vector3 }): void {
  const geometry = new THREE.BoxGeometry(LENGTH, WIDTH, THICK, 96, 1, 1);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const p = place(position.getX(i), position.getZ(i)).position;
    position.setXYZ(i, p.x, position.getY(i), p.z);
  }
  geometry.computeVertexNormals();
  const map = leatherTexture();
  if (map) map.repeat.set(1, 1);
  const leather = new THREE.MeshPhysicalMaterial({ color: colour, map, bumpMap: map, bumpScale: 1.5, roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color("#ffffff"), clearcoat: 0.3, clearcoatRoughness: 0.4 });
  add(group, geometry, leather);
}

/** The scalloped shield outline, `w` by `h`. */
function shield(w: number, h: number): THREE.Shape {
  const shape = new THREE.Shape();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const scallop = 1 + 0.045 * Math.cos(a * 10);
    const x = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.8 * (w / 2) * scallop;
    const y = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.9 * (h / 2) * scallop;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

function star(outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? outer : inner;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return shape;
}

function crown(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.055, 0);
  s.lineTo(-0.06, 0.045);
  s.lineTo(-0.03, 0.02);
  s.lineTo(0, 0.055);
  s.lineTo(0.03, 0.02);
  s.lineTo(0.06, 0.045);
  s.lineTo(0.055, 0);
  s.closePath();
  return s;
}

function extrude(shape: THREE.Shape, depth: number, bevel: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
}

function addPlate(group: THREE.Group, gold: THREE.Material, satin: THREE.Material, gems: THREE.Material[], enamel: string, title: string): void {
  const z = THICK / 2;
  add(group, extrude(shield(0.34, 0.27), 0.012, 0.006), gold).position.z = z;
  const face = z + 0.018;
  add(group, extrude(crown(), 0.008, 0.003), gold).position.set(0, 0.118, z);
  add(group, new THREE.CylinderGeometry(0.084, 0.084, 0.006, 64).rotateX(Math.PI / 2), satin).position.set(0, 0.02, face);
  const enamelMaterial = new THREE.MeshPhysicalMaterial({ color: enamel, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  add(group, new THREE.CylinderGeometry(0.07, 0.07, 0.004, 64).rotateX(Math.PI / 2), enamelMaterial).position.set(0, 0.02, face + 0.003);
  add(group, extrude(star(0.056, 0.024), 0.004, 0.002), gold).position.set(0, 0.02, face + 0.004);
  add(group, new THREE.TorusGeometry(0.084, 0.004, 10, 80), gold).position.set(0, 0.02, face + 0.003);
  // Gems round the medallion, leaving the bottom clear for the banner.
  for (let k = 0; k < 11; k++) {
    const a = Math.PI * (-0.18 + (k / 10) * 1.36);
    const stone = add(group, new THREE.OctahedronGeometry(0.011, 0), gems[k % gems.length]!);
    stone.scale.set(1, 1, 0.55);
    stone.position.set(Math.cos(a) * 0.104, 0.02 + Math.sin(a) * 0.104, face);
  }
  const banner = new THREE.MeshPhysicalMaterial({ map: bannerTexture(title, "#15161c"), metalness: 0.4, roughness: 0.3, clearcoat: 1 });
  add(group, new THREE.BoxGeometry(0.2, 0.038, 0.004), [satin, satin, satin, satin, banner, satin]).position.set(0, -0.088, face);
}

function sidePlate(gold: THREE.Material, satin: THREE.Material, stone: THREE.Material): THREE.Group {
  const plate = new THREE.Group();
  const shape = new THREE.Shape();
  const w = 0.045;
  const h = 0.05;
  const r = 0.014;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  add(plate, extrude(shape, 0.006, 0.004), gold);
  add(plate, new THREE.CylinderGeometry(0.024, 0.024, 0.004, 40).rotateX(Math.PI / 2), satin).position.z = 0.011;
  const g = add(plate, new THREE.OctahedronGeometry(0.017, 0), stone);
  g.scale.set(1, 1, 0.6);
  g.position.z = 0.014;
  return plate;
}
