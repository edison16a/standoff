import * as THREE from "three";
import { dentTexture } from "../textures";

const MAX = 48;
const LIFE_S = 8;

/**
 * Pock marks where missed shots strike the wall, the waves or the
 * counter. They fade after a few seconds, and the oldest is reused once
 * there are many, so a long round never piles them up.
 */
export class Dents {
  readonly object = new THREE.Group();
  private readonly marks: { mesh: THREE.Mesh; start: number }[] = [];
  private next = 0;

  constructor(private readonly random: () => number = Math.random) {
    const geometry = new THREE.PlaneGeometry(0.07, 0.07);
    const map = dentTexture();
    for (let i = 0; i < MAX; i++) {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      );
      mesh.visible = false;
      this.object.add(mesh);
      this.marks.push({ mesh, start: -Infinity });
    }
  }

  /** Leaves a mark at `at`, on a surface facing the players. */
  add(at: THREE.Vector3, now: number): void {
    const mark = this.marks[this.next]!;
    this.next = (this.next + 1) % MAX;
    // Just proud of the surface, so it never fights the cloth for depth.
    mark.mesh.position.set(at.x, at.y, at.z + 0.045);
    mark.mesh.rotation.z = this.random() * Math.PI;
    mark.mesh.visible = true;
    mark.start = now;
  }

  update(now: number): void {
    for (const mark of this.marks) {
      if (!mark.mesh.visible) continue;
      const t = (now - mark.start) / LIFE_S;
      if (t >= 1) mark.mesh.visible = false;
      else (mark.mesh.material as THREE.MeshBasicMaterial).opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    }
  }
}
