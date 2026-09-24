import * as THREE from "three";
import type { Obstacle } from "../../engine/obstacles";
import type { ObstacleKind } from "../../tracks/types";
import { obstacleGeometry } from "./obstacle-models";

/** Rocks sit on their middle, so they are lifted to rest on the road. */
const LIFT: Partial<Record<ObstacleKind, number>> = { asteroid: 1.8, boulder: 1.5 };

/**
 * The obstacles on the road, posed each frame from the engine: crabs
 * scuttle side to side, drones hover and tilt into their sweep, rocks
 * roll and asteroids tumble. Geometry is built once per kind.
 */
export class ObstacleView {
  readonly group = new THREE.Group();
  private readonly meshes: THREE.Object3D[] = [];
  private readonly lit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  private readonly glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(private readonly obstacles: readonly Obstacle[]) {
    const cache = new Map<ObstacleKind, ReturnType<typeof obstacleGeometry>>();
    for (const o of obstacles) {
      let geo = cache.get(o.def.kind);
      if (!geo) {
        geo = obstacleGeometry(o.def.kind);
        cache.set(o.def.kind, geo);
        this.geometries.push(geo.lit);
        if (geo.glow) this.geometries.push(geo.glow);
      }
      const holder = new THREE.Group();
      holder.add(new THREE.Mesh(geo.lit, this.lit));
      if (geo.glow) holder.add(new THREE.Mesh(geo.glow, this.glow));
      this.meshes.push(holder);
      this.group.add(holder);
    }
  }

  update(time: number, heading: (s: number) => number): void {
    this.obstacles.forEach((o, i) => {
      const mesh = this.meshes[i]!;
      const kind = o.def.kind;
      const lift = LIFT[kind] ?? 0;
      mesh.position.set(o.x, o.y + lift, o.z);
      const yaw = heading(o.s);
      switch (kind) {
        case "crab":
          mesh.rotation.set(0, yaw, 0);
          mesh.position.y += Math.abs(Math.sin(time * 14)) * 0.08;
          break;
        case "drone":
          mesh.rotation.set(0, yaw, o.moving * -0.25);
          mesh.position.y += Math.sin(time * 3 + i) * 0.15;
          break;
        case "boulder":
          mesh.rotation.set(0, yaw, -(o.d / 1.6));
          break;
        case "asteroid":
          mesh.rotation.set(time * 0.7 + i, time * 0.4, 0);
          break;
        default:
          mesh.rotation.set(0, yaw + i, 0);
      }
    });
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose();
    this.lit.dispose();
    this.glow.dispose();
  }
}
