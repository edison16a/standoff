import * as THREE from "three";
import type { Kart } from "../../engine/kart";
import { STACK_GAP, type Cube } from "../../engine/pickups";
import type { Track } from "../../engine/track";
import { softDot } from "../textures";
import { boxTint, glassMaterial, haloMaterial, markGeometry, markMaterial, shellGeometry } from "./box-look";
import { cubeTurn, popScale, shove, STACK_SCALE, stepWobble, stillWobble, type Wobble } from "./box-motion";

/** Seconds the light inside a broken box flares out for. */
const FLARE = 0.28;
/** A kart this close across the ground is inside the box. */
const INSIDE = 1.9;

interface BoxState {
  cube: Cube;
  tint: THREE.Color;
  /** First instance of its cubes in the shell, mark and halo meshes. */
  slot: number;
  /** Road height under it, or null over a gap, where it gets no pool of light. */
  ground: number | null;
  shownAt: number;
  brokeAt: number;
  taken: boolean;
  wobble: Wobble;
  /** Karts inside it last frame, so a shove lands once as a kart enters. */
  inside: Set<number>;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();
const FLAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

/**
 * The item boxes: glass cubes with a glowing star inside, a light at
 * their heart and a pool of it on the road below. A double box is two
 * gold cubes stacked, turning opposite ways. A taken box flares and is
 * gone, then swells back in. One a kart with full hands drives through
 * is knocked aside and swings back, whole. Every box shares five
 * instanced meshes.
 */
export class CubeView {
  readonly group = new THREE.Group();
  private readonly shell: THREE.InstancedMesh;
  private readonly mark: THREE.InstancedMesh;
  private readonly halo: THREE.InstancedMesh;
  private readonly pool: THREE.InstancedMesh;
  private readonly glass: THREE.MeshPhysicalMaterial;
  private readonly boxes: BoxState[];
  private last = 0;

  constructor(cubes: readonly Cube[], track: Track, environment: THREE.Texture | null) {
    let slot = 0;
    this.boxes = cubes.map((cube, i) => {
      const ground = track.groundAt(cube.s, cube.d);
      const box: BoxState = { cube, tint: new THREE.Color(boxTint(cube, i)), slot, ground: ground !== null && cube.y - ground < 2.5 ? ground : null, shownAt: -Infinity, brokeAt: -Infinity, taken: false, wobble: stillWobble(), inside: new Set() };
      slot += cube.count;
      return box;
    });
    const count = Math.max(1, slot);
    this.glass = glassMaterial(environment);
    this.shell = new THREE.InstancedMesh(shellGeometry(), this.glass, count);
    this.mark = new THREE.InstancedMesh(markGeometry(), markMaterial(), count);
    this.halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), haloMaterial(), count);
    const poolMat = new THREE.MeshBasicMaterial({ map: softDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolMat, Math.max(1, cubes.length));
    for (const box of this.boxes) {
      for (let level = 0; level < box.cube.count; level++) {
        this.shell.setColorAt(box.slot + level, box.tint);
        this.mark.setColorAt(box.slot + level, box.tint);
        this.halo.setColorAt(box.slot + level, box.tint);
      }
    }
    this.boxes.forEach((box, i) => this.pool.setColorAt(i, c.copy(box.tint).multiplyScalar(0.55)));
    this.shell.count = this.mark.count = this.halo.count = slot;
    this.pool.count = cubes.length;
    for (const mesh of [this.shell, this.mark, this.halo, this.pool]) mesh.frustumCulled = false;
    // The glass draws after the light inside it, so the light shows through.
    this.mark.renderOrder = 0;
    this.pool.renderOrder = 1;
    this.halo.renderOrder = 2;
    this.shell.renderOrder = 3;
    this.group.add(this.pool, this.mark, this.halo, this.shell);
  }

  /** The map's own sky, for the glass to reflect. */
  setEnvironment(environment: THREE.Texture | null): void {
    this.glass.envMap = environment;
    this.glass.needsUpdate = true;
  }

  update(time: number, karts: readonly Kart[]): void {
    const dt = this.last ? Math.min(0.1, Math.max(0, time - this.last)) : 0;
    this.last = time;
    this.boxes.forEach((box, i) => {
      this.watch(box, time, karts);
      stepWobble(box.wobble, dt);
      this.place(box, i, time);
    });
    for (const mesh of [this.shell, this.mark, this.halo, this.pool]) mesh.instanceMatrix.needsUpdate = true;
    this.halo.instanceColor!.needsUpdate = true;
  }

  /** Notes a box breaking or coming back, and shoves it for each kart that barges in while it stays whole. */
  private watch(box: BoxState, time: number, karts: readonly Kart[]): void {
    const taken = box.cube.respawnAt > 0;
    if (taken && !box.taken) box.brokeAt = time;
    if (!taken && box.taken) box.shownAt = time;
    box.taken = taken;
    const top = box.cube.y + (box.cube.count - 1) * STACK_GAP;
    for (const kart of karts) {
      const dx = box.cube.x - kart.x;
      const dz = box.cube.z - kart.z;
      const level = kart.y + 0.6 > box.cube.y - 2.2 && kart.y + 0.6 < top + 2.2;
      const inside = !taken && level && Math.hypot(dx, dz) < INSIDE;
      if (inside && !box.inside.has(kart.id)) shove(box.wobble, kart.vx, kart.vz, dx, dz);
      if (inside) box.inside.add(kart.id);
      else box.inside.delete(kart.id);
    }
  }

  private place(box: BoxState, index: number, time: number): void {
    const { cube, wobble } = box;
    const flaring = box.taken ? time - box.brokeAt : Infinity;
    const scale = box.taken ? 0 : popScale(time - box.shownAt);
    const stacked = cube.count === 2;
    for (let level = 0; level < cube.count; level++) {
      const i = box.slot + level;
      const turn = cubeTurn(index, level, cube.count, time);
      // The top of a stack swings further, so a shove leans the whole stack.
      const swing = 1 + level * 0.35;
      p.set(cube.x + wobble.x * swing, cube.y + turn.lift + level * STACK_GAP, cube.z + wobble.z * swing);
      const lean = stacked ? 0 : 0.35;
      q.setFromEuler(e.set(turn.tilt + wobble.z * 0.45, turn.yaw, lean - wobble.x * 0.45));
      const size = scale * (stacked ? STACK_SCALE : 1);
      m.compose(p, q, s.setScalar(size));
      this.shell.setMatrixAt(i, m);
      // The star turns against the box and breathes a little.
      q.setFromEuler(e.set(0.15 * Math.sin(time * 1.3 + i), -turn.yaw * 1.4 + 0.6, 0));
      m.compose(p, q, s.setScalar(size * (1 + Math.sin(time * 5 + i) * 0.05)));
      this.mark.setMatrixAt(i, m);
      // The light at its heart flares out as the box breaks.
      const flare = flaring < FLARE ? 1 - flaring / FLARE : 0;
      const glow = flaring < FLARE ? 0.9 * flare * flare : (0.75 + Math.sin(time * 3.1 + i) * 0.15) * scale;
      const haloSize = flaring < FLARE ? 2 + (1 - flare) * 1.6 : 2.4 * size;
      m.compose(p, q.identity(), s.setScalar(haloSize));
      this.halo.setMatrixAt(i, m);
      this.halo.setColorAt(i, c.copy(box.tint).multiplyScalar(glow));
    }
    this.placePool(box, index, scale, time);
  }

  /** The pool of light on the road, gone with the box and back with it. */
  private placePool(box: BoxState, index: number, scale: number, time: number): void {
    const size = box.ground === null ? 0 : scale * (box.cube.count === 2 ? 3.8 : 3) * (1 + Math.sin(time * 3.1 + index) * 0.06);
    p.set(box.cube.x + box.wobble.x, (box.ground ?? box.cube.y) + 0.04, box.cube.z + box.wobble.z);
    m.compose(p, FLAT, s.setScalar(size));
    this.pool.setMatrixAt(index, m);
  }

  dispose(): void {
    for (const mesh of [this.shell, this.mark, this.halo, this.pool]) {
      mesh.geometry.dispose();
      const material = mesh.material as THREE.Material & { map?: THREE.Texture | null };
      material.map?.dispose();
      material.dispose();
    }
  }
}
