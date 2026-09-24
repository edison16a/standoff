import * as THREE from "three";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { Offset, PelletHit } from "../engine/shooting";
import type { Zombie } from "../engine/zombie";
import { isBoss } from "../engine/zombie-kinds";
import type { Impact } from "./effects/effects";

export interface CastResult {
  hit: PelletHit | null;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impact: Impact;
}

/** How far a shot that hits nothing is drawn. */
const FAR = 60;

/**
 * Turns a player's aim into rays from the camera. HostAim points are in
 * clip space, so the ray goes straight through them; each bullet then
 * leans off by its small spread angle. The nearest zombie part or wall
 * along the ray is what the bullet hits.
 */
export class AimCaster {
  private readonly raycaster = new THREE.Raycaster();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.raycaster.far = 150;
  }

  cast(point: ScreenPoint, offset: Offset, targets: readonly THREE.Object3D[], zombie: (id: number) => Zombie | undefined): CastResult {
    this.raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), this.camera);
    const ray = this.raycaster.ray;
    if (offset.x !== 0 || offset.y !== 0) {
      this.right.setFromMatrixColumn(this.camera.matrixWorld, 0);
      this.up.setFromMatrixColumn(this.camera.matrixWorld, 1);
      ray.direction.addScaledVector(this.right, Math.tan(offset.x)).addScaledVector(this.up, Math.tan(offset.y)).normalize();
    }
    const found = this.raycaster.intersectObjects(targets as THREE.Object3D[], false)[0];
    if (!found) return { hit: null, point: ray.at(FAR, new THREE.Vector3()), normal: ray.direction.clone().negate(), impact: "none" };
    const normal = found.face ? found.face.normal.clone().transformDirection(found.object.matrixWorld) : ray.direction.clone().negate();
    const data = found.object.userData as { zombie?: number; part?: PelletHit["part"]; weak?: number | null };
    if (data.zombie === undefined || !data.part) return { hit: null, point: found.point, normal, impact: "world" };
    const z = zombie(data.zombie);
    const impact: Impact =
      data.part === "weak" ? "weak" : z && (isBoss(z.kind) || (z.kind === "armored" && data.part === "body")) ? "armor" : "flesh";
    return { hit: { zombie: data.zombie, part: data.part, weak: data.weak ?? null }, point: found.point, normal: ray.direction.clone().negate(), impact };
  }
}
