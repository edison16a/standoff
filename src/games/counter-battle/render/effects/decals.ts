import * as THREE from "three";
import { DRIP_FROM, TILE_COUNT } from "./decal-atlas";
import { DECAL_ATTRIBUTE, decalGeometry, type DecalMaterial } from "./decal-material";

/** Where one splat lands and how it lies. */
export interface SplatSpot {
  at: THREE.Vector3;
  /** Outward from the surface. */
  normal: THREE.Vector3;
  /** Which way the ball was flying, which stretches a glancing hit. */
  dir: THREE.Vector3;
  size: number;
  /** One over the surface's radius across, for a rounded bunker; 0 when flat. */
  curve: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const x = new THREE.Vector3();
const y = new THREE.Vector3();
const z = new THREE.Vector3();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const basis = new THREE.Matrix4();
const q = new THREE.Quaternion();
const m = new THREE.Matrix4();
const c = new THREE.Color();

/**
 * The frame a splat lies in: z out of the surface. On a wall its y is
 * straight up, so drips run down; on the ground it turns to lie along the
 * ball's flight, so a glancing hit smears the way it was going.
 */
export function splatFrame(normal: THREE.Vector3, dir: THREE.Vector3, spin: number, out: THREE.Quaternion): { wall: boolean; stretch: number } {
  z.copy(normal).normalize();
  const wall = Math.abs(z.y) < 0.55;
  if (wall) y.copy(UP).addScaledVector(z, -z.dot(UP)).normalize();
  else {
    y.copy(dir).addScaledVector(z, -z.dot(dir));
    if (y.lengthSq() < 1e-6) y.set(Math.cos(spin * 6.283), 0, Math.sin(spin * 6.283));
    y.normalize();
  }
  x.crossVectors(y, z).normalize();
  out.setFromRotationMatrix(basis.makeBasis(x, y, z));
  // A ball striking square on leaves a round splat; one skimming the surface smears out.
  const square = Math.abs(dir.dot(z));
  return { wall, stretch: Math.min(2, Math.max(1, 1 / (square + 0.35))) };
}

/**
 * Paint left where balls land, on the turf, the bunkers and the walls, in
 * the shooter's team colour. Splats on walls and the sides of bunkers
 * drip. One instanced draw for the whole field, capped: the oldest splat
 * gives way to the newest, and the field is clean again each round.
 */
export class Decals {
  readonly mesh: THREE.InstancedMesh;
  private readonly geo = decalGeometry();
  private readonly info: THREE.InstancedBufferAttribute;
  private next = 0;
  private used = 0;

  constructor(material: DecalMaterial, private readonly max = 360) {
    this.info = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.geo.setAttribute(DECAL_ATTRIBUTE, this.info);
    this.mesh = new THREE.InstancedMesh(this.geo, material, max);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
  }

  /** A splat at a spot, landing at battle time `now`. `pick` is a random number from 0 to 1. */
  add(spot: SplatSpot, colour: THREE.ColorRepresentation, now: number, pick: number, spin: number): void {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.used = Math.min(this.max, this.used + 1);
    const { wall, stretch } = splatFrame(spot.normal, spot.dir, spin, q);
    // Walls get the splats with drips; flat ground the rest.
    const half = TILE_COUNT - DRIP_FROM;
    const tile = (wall ? DRIP_FROM : 0) + Math.min(half - 1, Math.floor(pick * half));
    // Stood a hair off the surface so it never fights the bunker for the same depth.
    p.copy(spot.at).addScaledVector(spot.normal, 0.008);
    // A wall splat keeps its drips vertical and only widens; on the ground it smears along the flight.
    s.set(spot.size * (wall ? stretch : 1), spot.size * (wall ? 1 : stretch), spot.size);
    m.compose(p, q, s);
    this.mesh.setMatrixAt(i, m);
    this.mesh.setColorAt(i, c.set(colour));
    this.info.setXYZ(i, tile, now, spot.curve * spot.size * (wall ? stretch : 1));
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.info.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    this.next = 0;
    this.used = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.geo.dispose();
    this.mesh.dispose();
  }
}
