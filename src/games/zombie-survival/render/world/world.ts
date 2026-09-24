import * as THREE from "three";
import { SEGMENTS, type Zone } from "../../engine/route";
import { worldMaterials } from "./materials";
import { SegmentKit, type Lamp, type SegmentBuild } from "./segment-kit";
import { buildAlley } from "./zones/alley";
import { buildDocks } from "./zones/docks";
import { buildHighway } from "./zones/highway";
import { buildHospitalLot, buildRamp } from "./zones/hospital";
import { buildPark } from "./zones/park";
import { buildRoof } from "./zones/roof";
import { buildStreet } from "./zones/street";

const BUILDERS: Record<Zone, (kit: SegmentKit) => void> = {
  street: buildStreet,
  alley: buildAlley,
  park: buildPark,
  hospital: buildHospitalLot,
  ramp: buildRamp,
  roof: buildRoof,
  highway: buildHighway,
  docks: buildDocks,
};

let shared: Set<THREE.Material> | null = null;

function sharedMaterials(): Set<THREE.Material> {
  shared ??= new Set(Object.values(worldMaterials()).flat());
  return shared;
}

/** Real lights lent to the nearest lamps. A fixed count, so shaders never recompile mid game. */
const LIGHTS = 3;

/** How a lamp stutters: mostly on, with dropouts and buzzing, never in step with another. */
export function flickerLevel(seed: number, t: number): number {
  if (!seed) return 1;
  const slow = Math.sin(t * (0.7 + seed) + seed * 40);
  const fast = Math.sin(t * (23 + seed * 17)) * Math.sin(t * (7 + seed * 5) + seed);
  if (slow > 0.55) return fast > 0 ? 0.08 : 0.5;
  return fast > 0.92 ? 0.25 : 1;
}

/**
 * The city around the team. It keeps only the few segments near the
 * team built, building one new segment per frame as they walk so there
 * is never a long stall, and lends a handful of real lights to the lamps
 * closest to the camera.
 */
export class World {
  readonly group = new THREE.Group();
  private readonly built = new Map<number, SegmentBuild>();
  private readonly lights: THREE.PointLight[] = [];
  private solidCache: THREE.Mesh[] = [];

  constructor() {
    for (let i = 0; i < LIGHTS; i++) {
      const light = new THREE.PointLight(0xffc88a, 0, 24, 1.4);
      this.lights.push(light);
      this.group.add(light);
    }
  }

  /** Ground and walls near the team, for the raycast. */
  solids(): readonly THREE.Mesh[] {
    return this.solidCache;
  }

  segment(index: number): SegmentBuild | undefined {
    return this.built.get(index);
  }

  /** Moves the ship at the pier this many metres out to sea, for the escape. */
  sailShip(metres: number): void {
    const ship = this.built.get(SEGMENTS.length)?.group.getObjectByName("ship");
    if (!ship) return;
    const base = (ship.userData.base as THREE.Vector3 | undefined) ?? ship.position.clone();
    ship.userData.base = base;
    ship.position.copy(base);
    ship.position.x += metres;
  }

  /** Keeps the segments around `current` built. With `all`, builds every missing one now. */
  update(current: number, camera: THREE.Vector3, time: number, all = false): void {
    const wanted = new Set<number>();
    for (let k = current - 1; k <= current + 2; k++) if (k >= 1 && k <= SEGMENTS.length) wanted.add(k);
    for (const [index, build] of this.built) if (!wanted.has(index)) this.drop(index, build);
    const missing = [...wanted].filter((k) => !this.built.has(k)).sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
    for (const k of all ? missing : missing.slice(0, 1)) this.build(k);
    this.lightLamps(camera, time);
    for (const build of this.built.values()) build.tick?.(time);
  }

  dispose(): void {
    for (const [index, build] of this.built) this.drop(index, build);
  }

  private build(index: number): void {
    const seg = SEGMENTS[index - 1];
    if (!seg) return;
    const kit = new SegmentKit(seg);
    BUILDERS[seg.zone](kit);
    const build = kit.finish();
    this.group.add(build.group);
    this.built.set(index, build);
    this.solidCache = [...this.built.values()].flatMap((b) => b.solids);
  }

  private drop(index: number, build: SegmentBuild): void {
    this.group.remove(build.group);
    // The city's shared materials stay. Everything a segment made for itself (lamp
    // halos, signs, the ship's paint) goes with it, or a long run slowly leaks them.
    const keep = sharedMaterials();
    build.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh) && !(o instanceof THREE.Sprite)) return;
      // Sprites share one geometry across the whole renderer, so only meshes free theirs.
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      for (const material of [o.material as THREE.Material | THREE.Material[]].flat()) {
        if (!keep.has(material) && !material.userData.shared) material.dispose();
      }
    });
    this.built.delete(index);
    this.solidCache = [...this.built.values()].flatMap((b) => b.solids);
  }

  private lightLamps(camera: THREE.Vector3, time: number): void {
    const lamps: Lamp[] = [];
    for (const build of this.built.values()) lamps.push(...build.lamps);
    for (const lamp of lamps) {
      const level = flickerLevel(lamp.flicker, time);
      (lamp.halo.material as THREE.SpriteMaterial).opacity = 0.85 * level;
      if (lamp.cone) (lamp.cone.material as THREE.MeshBasicMaterial).opacity = 0.05 * level;
      if (lamp.flicker && lamp.bulb) (lamp.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 3 * level;
    }
    const nearest = lamps.map((lamp) => ({ lamp, d: lamp.at.distanceToSquared(camera) })).sort((a, b) => a.d - b.d);
    this.lights.forEach((light, i) => {
      const pick = nearest[i];
      if (!pick) {
        light.intensity = 0;
        return;
      }
      light.position.copy(pick.lamp.at);
      light.position.y -= 0.3;
      light.color.set(pick.lamp.colour);
      light.intensity = 22 * flickerLevel(pick.lamp.flicker, time);
    });
  }
}
