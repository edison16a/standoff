import * as THREE from "three";
import type { Course } from "../../engine/course";
import { laneX } from "../../engine/tuning";
import { coinGeometry, coinMaterial, pickupModel } from "../models/pickups";

const MAX_COINS = 360;
const VISIBLE = 170;

/**
 * The coins and power ups of one run. Every coin is one instance of a
 * single mesh, spinning together, so a sky full of coins is one draw.
 */
export class CollectibleView {
  readonly group = new THREE.Group();
  private readonly coins: THREE.InstancedMesh;
  private readonly pickups = new Map<number, THREE.Group>();
  private readonly seen = new Set<number>();
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.coins = new THREE.InstancedMesh(sharedCoin(), coinMaterial(), MAX_COINS);
    this.coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coins.frustumCulled = false;
    this.coins.userData.sharedGeometry = true;
    this.group.add(this.coins);
  }

  update(course: Course, distance: number, time: number): void {
    this.quat.setFromAxisAngle(this.up, time * 3.2);
    let count = 0;
    for (const coin of course.coins) {
      const ahead = coin.z - distance;
      if (ahead < -6 || ahead > VISIBLE || count >= MAX_COINS) continue;
      this.pos.set(coin.x, coin.y + Math.sin(time * 4 + coin.z * 0.4) * 0.06, -coin.z);
      this.matrix.compose(this.pos, this.quat, this.one);
      this.coins.setMatrixAt(count++, this.matrix);
    }
    this.coins.count = count;
    this.coins.instanceMatrix.needsUpdate = true;

    this.seen.clear();
    for (const p of course.pickups) {
      const ahead = p.z - distance;
      if (ahead < -6 || ahead > VISIBLE) continue;
      this.seen.add(p.id);
      let model = this.pickups.get(p.id);
      if (!model) {
        model = pickupModel(p.kind);
        this.pickups.set(p.id, model);
        this.group.add(model);
      }
      model.position.set(laneX(p.lane), p.y + 0.25 + Math.sin(time * 3 + p.id) * 0.12, -p.z);
      model.rotation.y = time * 2.2;
      const ring = model.getObjectByName("ring");
      if (ring) ring.scale.setScalar(1 + 0.12 * Math.sin(time * 6));
    }
    for (const [id, model] of this.pickups) {
      if (this.seen.has(id)) continue;
      this.group.remove(model);
      this.pickups.delete(id);
    }
  }

  clear(): void {
    for (const model of this.pickups.values()) this.group.remove(model);
    this.pickups.clear();
    this.coins.count = 0;
  }

  dispose(): void {
    this.clear();
    this.coins.dispose();
  }
}

let coin: THREE.BufferGeometry | null = null;

function sharedCoin(): THREE.BufferGeometry {
  coin ??= coinGeometry();
  return coin;
}
