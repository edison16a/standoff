import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CASINGS, type CasingSpec } from "../../ballistics/casings";
import type { WeaponId } from "../../engine/weapons";
import { gunMaterials } from "../models/guns/gun-kit";

/** Materials made here, as opposed to the shared gun set, which must never be disposed with the casings. */
interface OwnMaterials {
  /** Lacquered steel, the green grey of Russian surplus ammunition. */
  steel: THREE.MeshStandardMaterial;
  /** The primer and the dark mouth of an empty case. */
  dark: THREE.MeshStandardMaterial;
}

const SIDES = 12;

/** A turned profile as (radius, height) pairs from the head up, scaled by the case's size. */
function lathe(points: readonly (readonly [number, number])[], r: number, length: number): THREE.BufferGeometry {
  return new THREE.LatheGeometry(points.map(([pr, py]) => new THREE.Vector2(pr * r, py * length)), SIDES);
}

/** A flat disc facing up or down, for the primer and the open mouth. */
function disc(radius: number, y: number, up: boolean): THREE.BufferGeometry {
  return new THREE.CircleGeometry(radius, SIDES).rotateX(up ? -Math.PI / 2 : Math.PI / 2).translate(0, y, 0);
}

/**
 * The metal case: a rim and extractor groove at the head, then either a
 * straight wall (pistol rounds) or a body, shoulder and neck (rifle
 * rounds). Group 0 is the metal, group 1 the primer and mouth.
 */
function metalCase(spec: CasingSpec): THREE.BufferGeometry {
  const r = spec.diameter / 2;
  const L = spec.length;
  const bottleneck = L / spec.diameter > 3;
  const wall: [number, number][] = bottleneck
    ? [[0.6, 1], [0.6, 0.86], [0.92, 0.76], [0.97, 0.12]]
    : [[0.94, 1], [0.97, 0.14]];
  const profile: [number, number][] = [[0, 0], [1, 0], [1, 0.06], [0.82, 0.08], [0.82, 0.11], ...wall.reverse()];
  const mouth = bottleneck ? 0.6 : 0.94;
  const shell = lathe(profile, r, L);
  const primer = mergeGeometries([disc(r * 0.34, -0.0002, false), disc(r * mouth * 0.92, L + 0.0002, true)]);
  return finish([shell, primer], L);
}

/** A shotgun hull: a red plastic tube over a tall brass head, crimp open at the top. */
function hull(spec: CasingSpec): THREE.BufferGeometry {
  const r = spec.diameter / 2;
  const L = spec.length;
  const plastic = lathe([[0.95, 0.26], [0.95, 0.97], [0.9, 1]], r, L);
  const head = lathe([[0, 0], [1.06, 0], [1.06, 0.04], [1, 0.05], [1, 0.27], [0.95, 0.27]], r, L);
  const dark = mergeGeometries([disc(r * 0.3, -0.0002, false), disc(r * 0.9, L + 0.0002, true)]);
  return finish([plastic, head, dark], L);
}

/** Merges the parts as material groups and centres the case on its middle, so it tumbles about it. */
function finish(parts: THREE.BufferGeometry[], length: number): THREE.BufferGeometry {
  const clean = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of clean) {
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
  }
  const merged = mergeGeometries(clean, true);
  for (const g of [...parts, ...clean]) g.dispose();
  merged.translate(0, -length / 2, 0);
  return merged;
}

/**
 * One instanced mesh per gun's case, so every spent case on the street
 * draws in a call or three whatever their number. Brass catches the
 * flashlight like the gun's own brass, the AK's lacquered steel is duller
 * and the shotgun's hull is red plastic on a brass head.
 */
export class CasingMeshes {
  readonly group = new THREE.Group();
  readonly meshes: Record<WeaponId, THREE.InstancedMesh>;
  private readonly own: OwnMaterials;

  constructor(capacity: number) {
    const gun = gunMaterials();
    this.own = {
      steel: new THREE.MeshStandardMaterial({ color: 0x5f6652, metalness: 0.6, roughness: 0.42 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x3b3122, metalness: 0.8, roughness: 0.5 }),
    };
    const build = (weapon: WeaponId): THREE.InstancedMesh => {
      const spec = CASINGS[weapon];
      const geometry = spec.material === "hull" ? hull(spec) : metalCase(spec);
      const materials =
        spec.material === "hull" ? [gun.shellRed, gun.brass, this.own.dark] : [spec.material === "steel" ? this.own.steel : gun.brass, this.own.dark];
      const mesh = new THREE.InstancedMesh(geometry, materials, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      // Cases scatter far apart, so the mesh's bounds from its first frame would cull the rest.
      mesh.frustumCulled = false;
      mesh.name = `casings-${weapon}`;
      this.group.add(mesh);
      return mesh;
    };
    this.meshes = { shotgun: build("shotgun"), smg: build("smg"), rifle: build("rifle"), ak47: build("ak47") };
  }

  /** The steel shares the gun's reflections, which the renderer may set after this was built. */
  syncReflections(): void {
    const env = gunMaterials().brass.envMap;
    for (const mat of [this.own.steel, this.own.dark]) {
      if (mat.envMap === env) continue;
      mat.envMap = env;
      mat.envMapIntensity = 0.3;
      mat.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const mesh of Object.values(this.meshes)) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    this.own.steel.dispose();
    this.own.dark.dispose();
  }
}
