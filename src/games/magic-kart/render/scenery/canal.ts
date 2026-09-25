import * as THREE from "three";
import type { Track } from "../../engine/track";
import { liquidMaterial, liquidSheet } from "./liquid";

/** How far the canal runs out either side of the road, and how deep its walls go. */
const REACH = 70;
const DEPTH = 6;
const WATER = -3.6;

/** One canal: where it crosses the road, which way the road runs there, and how wide it is along the road. */
export interface CanalSpot {
  x: number;
  z: number;
  /** The road's direction over the canal. The canal runs across it. */
  tx: number;
  tz: number;
  half: number;
}

/** A canal under every gap in the road, lined up with the cliff faces the road leaves at each end. */
export function canalSpots(track: Track): CanalSpot[] {
  return track.gaps.map((gap) => {
    const mid = track.frameAt((gap.start + gap.end) / 2);
    const f = track.frameAt(gap.start);
    return { x: mid.x, z: mid.z, tx: f.tx, tz: f.tz, half: (gap.end - gap.start) / 2 };
  });
}

/** True if x, z is over a canal, or within `margin` metres of one. */
export function inCanal(spots: readonly CanalSpot[], x: number, z: number, margin = 0): boolean {
  return spots.some((c) => {
    const along = (x - c.x) * c.tx + (z - c.z) * c.tz;
    const across = (x - c.x) * -c.tz + (z - c.z) * c.tx;
    return Math.abs(along) < c.half + margin && Math.abs(across) < REACH + margin;
  });
}

/** The corners of a canal's opening, in order round it. */
function corners(c: CanalSpot): THREE.Vector2[] {
  const rx = -c.tz;
  const rz = c.tx;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector2(c.x + c.tx * c.half * a! + rx * REACH * b!, c.z + c.tz * c.half * a! + rz * REACH * b!));
}

/**
 * The city's street level as one big square with the canals cut out of
 * it, so the drop under the flyover jump is a real hole.
 */
export function streetWithCanals(spots: readonly CanalSpot[], centre: { x: number; z: number }, size: number, material: THREE.Material): THREE.Mesh {
  const h = size / 2;
  // Shapes are drawn on x and y; y becomes -z once laid flat.
  const shape = new THREE.Shape([[-h, -h], [h, -h], [h, h], [-h, h]].map(([a, b]) => new THREE.Vector2(centre.x + a!, -(centre.z + b!))));
  for (const c of spots) shape.holes.push(new THREE.Path(corners(c).map((p) => new THREE.Vector2(p.x, -p.y)).reverse()));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), material);
  mesh.position.y = -0.06;
  return mesh;
}

/**
 * The canals themselves: dark stone walls with a neon rail along the
 * top, end walls, and still water glowing with the city's colours.
 * Returns the group and the water, whose ripples the map animates.
 */
export function buildCanals(spots: readonly CanalSpot[]): { group: THREE.Group; water: THREE.ShaderMaterial } {
  const group = new THREE.Group();
  const water = liquidMaterial({ shallow: "#1f7f9e", deep: "#08142c", crest: "#9a5ee0", glow: true, scale: 7 });
  const stone = new THREE.MeshLambertMaterial({ color: "#2a2a3a", side: THREE.DoubleSide });
  const neon = [new THREE.MeshBasicMaterial({ color: "#1fe0ff", toneMapped: false }), new THREE.MeshBasicMaterial({ color: "#ff3fb4", toneMapped: false })];
  for (const c of spots) {
    const yaw = Math.atan2(c.tx, c.tz);
    const place = (mesh: THREE.Mesh, along: number, across: number, y: number) => {
      mesh.position.set(c.x + c.tx * along - c.tz * across, y, c.z + c.tz * along + c.tx * across);
      mesh.rotation.y = yaw;
      group.add(mesh);
    };
    for (const side of [-1, 1]) {
      // The long walls face the road's direction, so they sit at either end of the gap.
      place(new THREE.Mesh(new THREE.PlaneGeometry(REACH * 2, DEPTH), stone), side * c.half, 0, -DEPTH / 2);
      place(new THREE.Mesh(new THREE.BoxGeometry(REACH * 2, 0.14, 0.3), neon[(side + 1) / 2]!), side * (c.half - 0.12), 0, -0.25);
      const end = new THREE.Mesh(new THREE.PlaneGeometry(c.half * 2, DEPTH), stone);
      end.rotation.y = Math.PI / 2;
      const endWall = new THREE.Group().add(end);
      endWall.position.set(c.x - c.tz * side * REACH, -DEPTH / 2, c.z + c.tx * side * REACH);
      endWall.rotation.y = yaw;
      group.add(endWall);
    }
    const sheet = liquidSheet(water, REACH * 2, c.half * 2, 0, WATER, 0);
    place(sheet, 0, 0, WATER);
  }
  return { group, water };
}
