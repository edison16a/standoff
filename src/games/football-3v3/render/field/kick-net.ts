import * as THREE from "three";
import { POSTS } from "../../engine/field";
import { GOAL } from "../../engine/physics/posts";
import type { GoalHitView } from "../../engine/view";
import { cyl, merge, paint } from "../models/geo";

const N = GOAL.net;
const WIDTH = N.halfWidth * 2;
const HEIGHT = N.top - N.bottom;

/** A square mesh of cord, tiled across the net. */
function cordTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(235,240,250,0.85)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 30, 30);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(WIDTH / 0.35, HEIGHT / 0.35);
  return t;
}

/**
 * The kicking net behind each goal post, hung between two poles. It is
 * where the engine's net is, and it bulges where a kick hits it: a dent
 * that swings out and back and dies away, as cord does.
 */
export class KickNets {
  readonly group = new THREE.Group();
  private readonly nets: { side: 1 | -1; mesh: THREE.Mesh; rest: Float32Array; dented: boolean }[] = [];
  private readonly texture = cordTexture();
  private readonly material: THREE.MeshBasicMaterial;

  constructor(poleMaterial: THREE.Material) {
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [1, -1] as const) {
      const geo = new THREE.PlaneGeometry(WIDTH, HEIGHT, 36, 32);
      // The plane faces +z; turn it to face along x, standing behind the posts.
      geo.rotateY(Math.PI / 2);
      geo.translate(side * (POSTS.x + N.behind), (N.top + N.bottom) / 2, 0);
      const mesh = new THREE.Mesh(geo, this.material);
      const rest = Float32Array.from(geo.getAttribute("position").array as ArrayLike<number>);
      this.nets.push({ side, mesh, rest, dented: false });
      this.group.add(mesh);
      const x = side * (POSTS.x + N.behind);
      const poles = merge([-1, 1].map((s) => paint(cyl(0.08, 0.1, N.top + 0.6, 8), "#2b3140", { at: [x, (N.top + 0.6) / 2, s * (N.halfWidth + 0.1)] })));
      this.group.add(new THREE.Mesh(poles, poleMaterial));
    }
  }

  update(goal: GoalHitView | null): void {
    for (const net of this.nets) {
      const hit = goal && goal.part === "net" && goal.side === net.side && goal.age < 2.5 ? goal : null;
      if (!hit && !net.dented) continue;
      const pos = net.mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      arr.set(net.rest);
      net.dented = !!hit;
      if (hit) {
        // A dent pushed out behind the posts, swinging back and settling.
        const amp = Math.min(1.4, 0.4 + hit.power * 0.3) * Math.exp(-hit.age * 2.4) * Math.cos(hit.age * 7);
        for (let i = 0; i < pos.count; i++) {
          const dy = arr[i * 3 + 1]! - hit.y;
          const dz = arr[i * 3 + 2]! - hit.z;
          arr[i * 3] = arr[i * 3]! + net.side * amp * Math.exp(-(dy * dy + dz * dz) / 2.6);
        }
      }
      pos.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const o of this.group.children) if (o instanceof THREE.Mesh) o.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
