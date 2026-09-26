import * as THREE from "three";
import type { Slot } from "@/games/blade-clash/players";
import { disposeOwned } from "../kit/mesh-builder";
import { seeded } from "../kit/textures";
import type { ArenaTheme } from "./arena-theme";
import { blockTexture } from "./arena-textures";
import { Crowd, type Seat } from "./crowd";

/** The first row's front edge and height, how deep and high each row steps, and how many rows. */
export const STANDS = { radius: 16.2, height: 3.5, depth: 0.9, rise: 0.56, rows: 10 };
/** The stands break this far either side of each gate, in radians. */
export const GATE_GAP = 0.2;
const SEAT_SPACING = 0.66;

/** The two arcs of seating between the gates, as lathe start and length (angles from +z toward +x). */
const ARCS: [number, number][] = [
  [Math.PI / 2 + GATE_GAP, Math.PI - 2 * GATE_GAP],
  [(3 * Math.PI) / 2 + GATE_GAP, Math.PI - 2 * GATE_GAP],
];

/** The tiers as a lathe profile, from the top row's back down to the front wall, so treads face up and risers face in. */
function tierProfile(): THREE.Vector2[] {
  const { radius, height, depth, rise, rows } = STANDS;
  const points: THREE.Vector2[] = [new THREE.Vector2(radius + rows * depth + 0.6, height + (rows - 1) * rise)];
  for (let i = rows - 1; i >= 0; i--) {
    const y = height + i * rise;
    points.push(new THREE.Vector2(radius + i * depth, y));
    points.push(new THREE.Vector2(radius + i * depth, i === 0 ? 0 : y - rise));
  }
  return points;
}

/**
 * Stone tiers all the way round the arena, broken only by the two gates,
 * full of people, with a high outer wall behind the top row. The crowd
 * faces the dais from every side, so each player sees a full house
 * behind their opponent.
 */
export class Stands {
  readonly group = new THREE.Group();
  private readonly crowd: Crowd | null;

  constructor(theme: ArenaTheme, withCrowd: boolean) {
    const blocks = blockTexture(theme.stone).clone();
    blocks.repeat.set(24, 3);
    blocks.needsUpdate = true;
    const stone = new THREE.MeshStandardMaterial({ map: blocks, color: 0xffffff, roughness: 0.9, flatShading: true });
    const profile = tierProfile();
    const top = STANDS.height + STANDS.rows * STANDS.rise;
    const outer = STANDS.radius + STANDS.rows * STANDS.depth + 0.6;
    const wallMaterial = new THREE.MeshStandardMaterial({ map: blocks, color: 0xd9d2c6, roughness: 0.9, side: THREE.BackSide });
    for (const [start, length] of ARCS) {
      const tiers = new THREE.Mesh(new THREE.LatheGeometry(profile, 72, start, length), stone);
      tiers.receiveShadow = true;
      // The outer wall rises behind the top row, arches cut into its face.
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(outer, outer, 5, 72, 1, true, start, length), wallMaterial);
      wall.position.y = top + 2.5 - STANDS.rise;
      this.group.add(tiers, wall);
    }
    this.crowd = withCrowd ? new Crowd(seats(), theme.crowdLight) : null;
    if (this.crowd) this.group.add(this.crowd.group);
  }

  roar(t: number, side: Slot | null, strength: number): void {
    this.crowd?.roar(t, side, strength);
  }

  update(t: number): void {
    this.crowd?.update(t);
  }

  dispose(): void {
    this.crowd?.dispose();
    disposeOwned(this.group);
  }
}

/** A seat for most places on every row, facing the middle. */
function seats(): Seat[] {
  const rand = seeded(99);
  const out: Seat[] = [];
  for (let row = 0; row < STANDS.rows; row++) {
    const r = STANDS.radius + row * STANDS.depth + 0.3;
    const y = STANDS.height + row * STANDS.rise;
    const step = SEAT_SPACING / r;
    for (const [start, length] of ARCS) {
      for (let a = start + step / 2 + (row % 2) * step * 0.5; a < start + length; a += step) {
        if (rand() > 0.86) continue;
        const x = r * Math.sin(a);
        const z = r * Math.cos(a);
        out.push({ x, y, z, facing: Math.atan2(-x, -z) });
      }
    }
  }
  return out;
}
