import * as THREE from "three";
import { seeded } from "../../engine/rng";
import { TEAMS } from "../../roster";

/** One block of stands: rows stepping back and up from a front edge. */
export interface Section {
  /** Front centre of the first row. */
  x: number;
  z: number;
  /** Which way the fans face, as a floor angle (0 faces +z). */
  yaw: number;
  width: number;
  rows: number;
}

const ROW_DEPTH = 0.85;
const ROW_RISE = 0.48;
const SEAT = 0.62;

const SHIRTS = [TEAMS[0].color, TEAMS[1].color, TEAMS[0].color, TEAMS[1].color, "#f8fafc", "#111827", "#facc15", "#22c55e", "#f97316", "#94a3b8"];
const SKINS = ["#f1c7a3", "#d9a47a", "#a86f4c", "#6b4430", "#4b2e1e", "#e8b893"];

/**
 * The fans: hundreds of people drawn as three instanced meshes (bodies,
 * heads and raised arms) so the whole crowd costs three draws. Their
 * bouncing runs in the vertex shader from one excitement level, so a
 * roar sets every seat jumping without touching a single matrix.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private readonly uniforms = { uTime: { value: 0 }, uExcite: { value: 0.1 } };
  private readonly meshes: THREE.InstancedMesh[] = [];
  private excite = 0.1;
  private target = 0.1;

  constructor(sections: readonly Section[]) {
    const rng = seeded(33);
    const seats: { m: THREE.Matrix4; phase: number; shirt: THREE.Color; skin: THREE.Color }[] = [];
    const stands: THREE.BufferGeometry[] = [];
    for (const s of sections) {
      const across = Math.floor(s.width / SEAT);
      const fx = Math.sin(s.yaw);
      const fz = Math.cos(s.yaw);
      const rx = Math.cos(s.yaw);
      const rz = -Math.sin(s.yaw);
      for (let row = 0; row < s.rows; row++) {
        const back = row * ROW_DEPTH;
        const y = 0.35 + row * ROW_RISE;
        const step = new THREE.BoxGeometry(s.width + 1, y + 0.1, ROW_DEPTH);
        step.rotateY(s.yaw);
        step.translate(s.x - fx * (back + ROW_DEPTH * 0.5), (y + 0.1) / 2, s.z - fz * (back + ROW_DEPTH * 0.5));
        stands.push(step);
        for (let i = 0; i < across; i++) {
          if (rng() < 0.08) continue;
          const side = (i - across / 2 + 0.5) * SEAT + (rng() - 0.5) * 0.12;
          const m = new THREE.Matrix4().makeRotationY(s.yaw + (rng() - 0.5) * 0.3);
          const scale = 0.9 + rng() * 0.2;
          m.scale(new THREE.Vector3(scale, scale, scale));
          m.setPosition(s.x + rx * side - fx * (back + 0.35), y + 0.1, s.z + rz * side - fz * (back + 0.35));
          // Higher rows sit further from the court lights, so they fade a little darker.
          const dim = 0.75 - row * 0.02;
          const shirt = new THREE.Color(SHIRTS[Math.floor(rng() * SHIRTS.length)]!).multiplyScalar(dim);
          seats.push({ m, phase: rng() * Math.PI * 2, shirt, skin: new THREE.Color(SKINS[Math.floor(rng() * SKINS.length)]!).multiplyScalar(dim) });
        }
      }
    }
    const standGeo = mergeBoxes(stands);
    const stand = new THREE.Mesh(standGeo, new THREE.MeshStandardMaterial({ color: "#1b1f33", roughness: 0.9 }));
    stand.receiveShadow = true;
    this.group.add(stand);

    const body = new THREE.CapsuleGeometry(0.2, 0.42, 3, 8);
    body.translate(0, 0.42, 0);
    const head = new THREE.SphereGeometry(0.12, 10, 8);
    head.translate(0, 0.98, 0.02);
    const arms = new THREE.BoxGeometry(0.1, 0.55, 0.1);
    arms.translate(0, 0.28, 0);
    const armPair = mergeBoxes([arms.clone().rotateZ(0.35).translate(-0.24, 0.9, 0), arms.clone().rotateZ(-0.35).translate(0.24, 0.9, 0)]);
    const phases = new Float32Array(seats.map((s) => s.phase));
    const parts: [THREE.BufferGeometry, "shirt" | "skin", boolean][] = [
      [body, "shirt", false],
      [head, "skin", false],
      [armPair, "shirt", true],
    ];
    for (const [geo, paint, isArms] of parts) {
      geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
      this.hook(mat, isArms);
      const mesh = new THREE.InstancedMesh(geo, mat, seats.length);
      seats.forEach((s, i) => {
        mesh.setMatrixAt(i, s.m);
        mesh.setColorAt(i, paint === "shirt" ? s.shirt : s.skin);
      });
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  /** How loud the moment is, 0 seated and murmuring to 1 on their feet. It eases toward it. */
  cheer(level: number): void {
    this.target = Math.max(this.target, level);
  }

  update(dt: number, time: number, calm: number): void {
    this.target += (calm - this.target) * Math.min(1, dt * 0.6);
    this.excite += (this.target - this.excite) * Math.min(1, dt * 5);
    this.uniforms.uTime.value = time;
    this.uniforms.uExcite.value = this.excite;
  }

  /** Adds the bounce to the stock Lambert shader: fans hop and their arms go up with the excitement. */
  private hook(mat: THREE.MeshLambertMaterial, arms: boolean): void {
    // The two hooks read the same as text, so without their own keys three.js would share one program.
    mat.customProgramCacheKey = () => (arms ? "nba-crowd-arms" : "nba-crowd-body");
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uExcite = this.uniforms.uExcite;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aPhase;\nuniform float uTime;\nuniform float uExcite;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float hop = max(0.0, sin(uTime * (7.0 + fract(aPhase) * 4.0) + aPhase * 6.28)) * uExcite * 0.28;
          float sway = sin(uTime * 1.3 + aPhase * 3.0) * 0.03;
          transformed.y += hop;
          transformed.x += sway;
          ${arms ? "float up = smoothstep(0.35, 0.8, uExcite + fract(aPhase * 7.0) * 0.3 - 0.15); transformed.y = mix(0.62, transformed.y, up); transformed.xz *= mix(0.2, 1.0, up);" : ""}`,
        );
    };
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    });
  }
}

function mergeBoxes(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    g.deleteAttribute("uv");
    return g;
  });
  const total = clean.reduce((n, g) => n + g.getAttribute("position").count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let off = 0;
  for (const g of clean) {
    pos.set(g.getAttribute("position").array as Float32Array, off * 3);
    nor.set(g.getAttribute("normal").array as Float32Array, off * 3);
    off += g.getAttribute("position").count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}
