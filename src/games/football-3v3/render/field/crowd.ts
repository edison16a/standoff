import * as THREE from "three";
import { TEAMS } from "../../teams";
import { box, merge, paint } from "../models/geo";
import { BOWL, edge, LOWER, seat, UPPER } from "./bowl";

/**
 * The crowd: one instanced mesh of simple fans, a person in most seats,
 * wearing mostly the two teams' colours. They bob in the vertex shader,
 * gently all game and jumping for a touchdown, so thousands of fans cost
 * one draw call and no work per frame on the processor.
 */
export class Crowd {
  readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.MeshLambertMaterial;
  private readonly uniforms = { uTime: { value: 0 }, uExcite: { value: 0.1 } };
  private excite = 0.1;

  constructor(spacing = 0.72) {
    const geo = merge([
      paint(box(0.42, 0.62, 0.3), "#ffffff", { at: [0, 0.31, 0] }),
      paint(box(0.2, 0.22, 0.2), "#e0b793", { at: [0, 0.74, 0] }),
    ]);
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uExcite;")
        .replace(
          "#include <begin_vertex>",
          // Each fan bounces on their own beat; the whole crowd jumps higher with the excitement.
          "#include <begin_vertex>\nfloat fan = float(gl_InstanceID);\ntransformed.y += abs(sin(uTime * (5.0 + mod(fan, 5.0)) + fan * 1.7)) * uExcite * 0.35;",
        );
    };
    const spots: THREE.Vector3[] = [];
    let n = 7;
    // The upper deck sits further from the camera, so its fans are spaced a little wider.
    for (const [deck, gap] of [[LOWER, spacing], [UPPER, spacing * 1.15]] as const) {
      for (let r = 0; r < deck.rows; r++) {
        const count = Math.floor(around(deck.out + (r + 0.5) * deck.rowDepth) / gap);
        for (let i = 0; i < count; i++) {
          n = (n * 16807) % 2147483647;
          // A few empty seats keep it from looking like wallpaper.
          if (n % 100 < 14) continue;
          spots.push(seat(deck, (i / count) * Math.PI * 2, r + 0.45));
        }
      }
    }
    this.mesh = new THREE.InstancedMesh(geo, this.material, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const shirts = [TEAMS[0].color, TEAMS[0].color, TEAMS[1].color, TEAMS[1].color, TEAMS[0].trim, "#ffffff", "#20242c", "#c9ced6"];
    const colour = new THREE.Color();
    spots.forEach((p, i) => {
      // Everyone faces the middle of the field.
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-p.x, -p.z));
      const h = 0.9 + ((i * 37) % 23) / 100;
      m.compose(p, q, new THREE.Vector3(1, h, 1));
      this.mesh.setMatrixAt(i, m);
      // Home fans fill the side behind Storm's bench, away fans the other.
      const side = p.z > 0 ? 0 : 1;
      const pick = (i * 7919) % 11;
      colour.set(pick < 6 ? TEAMS[side as 0 | 1].color : shirts[pick % shirts.length]!);
      this.mesh.setColorAt(i, colour);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** 0 for a murmur, 1 for a touchdown roar. */
  setExcitement(level: number): void {
    this.excite = level;
  }

  update(time: number, dt: number): void {
    this.uniforms.uTime.value = time;
    const u = this.uniforms.uExcite;
    u.value += (this.excite - u.value) * (1 - Math.exp(-dt * 3));
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** The length of the ring `out` metres behind the bowl's front edge. */
function around(out: number): number {
  let total = 0;
  let last = edge(BOWL, 0);
  for (let i = 1; i <= 256; i++) {
    const e = edge(BOWL, (i / 256) * Math.PI * 2);
    total += Math.hypot(e.x + e.nx * out - (last.x + last.nx * out), e.z + e.nz * out - (last.z + last.nz * out));
    last = e;
  }
  return total;
}
