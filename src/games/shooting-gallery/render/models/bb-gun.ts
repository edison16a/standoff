import * as THREE from "three";
import { grainTexture } from "../textures";
import { barrelGeometry, bandGeometry, LASER_AT, laserGeometry, MUZZLE_Z, BARREL_Y, pumpGeometry, receiverGeometry, stockGeometry } from "./bb-gun-parts";
import { FINISHES, type FinishId } from "./finishes";

/**
 * A whole pump action BB rifle in one player's finish. The parts that
 * move are exposed: the pump slides back and forth between shots, and the
 * muzzle and laser mark where the BB and the beam leave the gun.
 */
export interface BBGun {
  root: THREE.Group;
  /** Slides along z. 0 is forward, negative is pumped back. */
  pump: THREE.Object3D;
  /** At the mouth of the barrel, where the BB and the puff come out. */
  muzzle: THREE.Object3D;
  /** At the laser's lens, where the beam starts. */
  laser: THREE.Object3D;
  setFinish(id: FinishId): void;
  setColour(colour: string): void;
  dispose(): void;
}

interface Geometry {
  barrel: THREE.BufferGeometry;
  bands: THREE.BufferGeometry;
  pump: THREE.BufferGeometry;
  receiver: ReturnType<typeof receiverGeometry>;
  stock: ReturnType<typeof stockGeometry>;
  laser: ReturnType<typeof laserGeometry>;
  bore: THREE.BufferGeometry;
}

let geometry: Geometry | null = null;
let grain: THREE.Texture | null = null;

function shared(): Geometry {
  geometry ??= {
    barrel: barrelGeometry(),
    bands: bandGeometry(),
    pump: pumpGeometry(),
    receiver: receiverGeometry(),
    stock: stockGeometry(),
    laser: laserGeometry(),
    bore: new THREE.CircleGeometry(0.0062, 16).translate(0, BARREL_Y, MUZZLE_Z - 0.024),
  };
  return geometry;
}

function woodGrain(): THREE.Texture {
  if (!grain) {
    grain = grainTexture(4);
    grain.repeat.set(3, 6);
  }
  return grain;
}

/** One set of materials per gun, so each player's finish is independent. */
function materials() {
  return {
    stock: new THREE.MeshPhysicalMaterial({ clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.6, metalness: 0.4 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.9 }),
    lens: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  };
}

export function createBBGun(finish: FinishId, colour: string): BBGun {
  const g = shared();
  const mats = materials();
  const root = new THREE.Group();
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  add(root, g.barrel, mats.metal);
  add(root, g.bands, mats.trim);
  add(root, g.receiver.body, mats.metal);
  add(root, g.receiver.dark, mats.dark);
  add(root, g.receiver.trim, mats.trim);
  add(root, g.stock.wood, mats.stock);
  add(root, g.stock.butt, mats.rubber);
  add(root, g.laser.body, mats.dark);
  add(root, g.laser.lens, mats.lens);
  add(root, g.bore, mats.rubber);

  const pump = new THREE.Group();
  add(pump, g.pump, mats.stock);
  root.add(pump);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, BARREL_Y, MUZZLE_Z);
  const laser = new THREE.Object3D();
  laser.position.copy(LASER_AT);
  root.add(muzzle, laser);

  const setFinish = (id: FinishId) => {
    const look = FINISHES[id];
    mats.stock.color.set(look.stock.color);
    mats.stock.roughness = look.stock.roughness;
    mats.stock.map = look.stock.grain ? woodGrain() : null;
    mats.stock.clearcoat = look.stock.grain ? 0.35 : 0.8;
    mats.stock.needsUpdate = true;
    mats.metal.color.set(look.metal.color);
    mats.metal.metalness = look.metal.metalness;
    mats.metal.roughness = look.metal.roughness;
    mats.trim.color.set(look.trim);
  };
  setFinish(finish);
  mats.lens.color.set(colour);

  return {
    root,
    pump,
    muzzle,
    laser,
    setFinish,
    setColour: (next) => mats.lens.color.set(next),
    dispose: () => Object.values(mats).forEach((material) => material.dispose()),
  };
}
