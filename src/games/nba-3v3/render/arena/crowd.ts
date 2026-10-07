import * as THREE from "three";
import { TEAMS } from "../../roster";
import { fanArms, fanBody, fanHead, SHOULDER } from "./fan-geometry";
import { CrowdFlashes } from "./crowd-flashes";
import type { Seat } from "./seat-layout";

// Team colours for the fans who dressed up, and mostly everyday clothes: darks, greys, denim and a few whites.
// A crowd of bright primaries reads as a toy; muted stands make the lit court pop like a broadcast.
const SHIRTS = [
  TEAMS[0].color, TEAMS[1].color, TEAMS[0].color, TEAMS[1].color, TEAMS[0].dark, TEAMS[1].dark,
  "#1f2937", "#111827", "#374151", "#4b5563", "#1e293b", "#3f3f46",
  "#e5e7eb", "#cbd5e1", "#35507a", "#5b3a2e", "#6b7280", "#7c2d12", "#14532d", "#78350f",
];
const TROUSERS = ["#1e293b", "#27324a", "#334155", "#111827", "#3b4a63", "#57534e", "#1c1917", "#a8a29e"];
const SKINS = ["#f1c7a3", "#d9a47a", "#a86f4c", "#6b4430", "#4b2e1e", "#e8b893", "#c68a62"];
const HAIR = ["#120c08", "#1f140c", "#3b2414", "#5a3a1e", "#8a6a3a", "#b9b2a6", "#0a0a0a"];

const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const pick = <T>(list: readonly T[], r: number): T => list[Math.floor(r * list.length) % list.length]!;

/**
 * The fans: two thousand seated people drawn as three instanced meshes
 * (bodies, heads, arms), each in two colours of its own (shirt and
 * trousers, skin and hair, sleeve and forearm), so the whole crowd costs
 * three draws. Their life runs in the vertex shader from one excitement
 * level: a calm crowd sits with hands in laps, a roar brings them up off
 * their seats with arms in the air, and camera flashes pop round the bowl.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private readonly uniforms = { uTime: { value: 0 }, uExcite: { value: 0.1 } };
  private readonly flashes: CrowdFlashes;
  private excite = 0.1;
  private target = 0.1;

  constructor(seats: readonly Seat[], seed = 7) {
    let r = seed;
    const rand = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
    // About one seat in fourteen is empty, and the empties cluster toward the back.
    const taken = seats.filter((seat) => seat.luck > 0.04 + seat.row * 0.004);
    const n = taken.length;
    const phase = new Float32Array(n);
    const colours = { body: [new Float32Array(n * 3), new Float32Array(n * 3)], head: [new Float32Array(n * 3), new Float32Array(n * 3)], arms: [new Float32Array(n * 3), new Float32Array(n * 3)] };
    const matrices: THREE.Matrix4[] = [];
    const c = new THREE.Color();
    taken.forEach((seat, i) => {
      const size = 0.92 + rand() * 0.16;
      matrices.push(new THREE.Matrix4().compose(p.set(seat.x, seat.y, seat.z), q.setFromAxisAngle(UP, seat.yaw + (rand() - 0.5) * 0.35), s.set(size * (0.94 + rand() * 0.12), size, size)));
      phase[i] = rand() * Math.PI * 2;
      // Higher rows sit further from the court lights, so they fade a little darker.
      const dim = 0.66 - seat.row * 0.02;
      const shirt = pick(SHIRTS, rand());
      const skin = pick(SKINS, rand());
      const put = (out: Float32Array, hex: string) => c.set(hex).multiplyScalar(dim).toArray(out, i * 3);
      put(colours.body[0]!, shirt);
      put(colours.body[1]!, pick(TROUSERS, rand()));
      put(colours.head[0]!, skin);
      put(colours.head[1]!, rand() < 0.12 ? skin : pick(HAIR, rand()));
      put(colours.arms[0]!, shirt);
      put(colours.arms[1]!, rand() < 0.3 ? shirt : skin);
    });

    const parts = [
      ["body", fanBody()],
      ["head", fanHead()],
      ["arms", fanArms()],
    ] as const;
    for (const [name, geo] of parts) {
      geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
      geo.setAttribute("aB", new THREE.InstancedBufferAttribute(colours[name][1]!, 3));
      const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
      this.hook(mat, name === "arms");
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colours[name][0]!, 3);
      matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.flashes = new CrowdFlashes(taken, this.uniforms);
    this.group.add(this.flashes.points);
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

  /** Adds the crowd's life to the stock Lambert shader: two colours per fan, standing, hopping and raised arms. */
  private hook(mat: THREE.MeshLambertMaterial, arms: boolean): void {
    // The hooks differ only in text three.js cannot see, so each needs its own program key.
    mat.customProgramCacheKey = () => (arms ? "nba-fans-arms" : "nba-fans");
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uExcite = this.uniforms.uExcite;
      const head = `#include <common>
        attribute float aPhase;
        attribute float aPart;
        attribute vec3 aB;
        varying vec3 vSecond;
        varying float vPart;
        ${arms ? "attribute float aSide;" : ""}
        uniform float uTime;
        uniform float uExcite;
        // How far this fan is out of his seat, and how high his arms are: each fan has his own threshold.
        float risen() { return smoothstep(0.3, 0.75, uExcite + fract(aPhase * 3.7) * 0.35 - 0.18); }
        vec3 swing(vec3 v, float up, float side) {
          float a = mix(2.9, 0.12, up);
          v.yz = vec2(v.y * cos(a) - v.z * sin(a), v.y * sin(a) + v.z * cos(a));
          float b = -side * mix(0.04, 0.42 + fract(aPhase * 5.3) * 0.3, up);
          v.xy = vec2(v.x * cos(b) - v.y * sin(b), v.x * sin(b) + v.y * cos(b));
          return v;
        }`;
      const arm = arms
        ? `float up = smoothstep(0.35, 0.8, uExcite + fract(aPhase * 7.0) * 0.3 - 0.15);
           transformed = swing(transformed, up, aSide) + vec3(aSide * ${SHOULDER.x.toFixed(3)}, ${SHOULDER.y.toFixed(3)}, 0.0);`
        : "";
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", head)
        .replace("#include <beginnormal_vertex>", arms ? "#include <beginnormal_vertex>\nobjectNormal = swing(objectNormal, smoothstep(0.35, 0.8, uExcite + fract(aPhase * 7.0) * 0.3 - 0.15), aSide);" : "#include <beginnormal_vertex>")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          ${arm}
          float stand = risen();
          float hop = max(0.0, sin(uTime * (7.0 + fract(aPhase) * 4.0) + aPhase * 6.28)) * uExcite * uExcite * 0.16;
          transformed.y += stand * 0.3 * step(0.3, transformed.y) + hop;
          transformed.x += sin(uTime * 1.3 + aPhase * 3.0) * 0.025 * step(0.4, transformed.y);`,
        )
        .replace(
          "#include <color_vertex>",
          `#include <color_vertex>
          vSecond = aB;
          vPart = aPart;
          ${arms ? "" : "// A little shade low down, where the fan sits between the rows.\n          vColor.rgb *= mix(0.55, 1.0, smoothstep(0.25, 0.9, position.y));\n          vSecond *= mix(0.55, 1.0, smoothstep(0.25, 0.9, position.y));"}`,
        );
      // The two colours meet at a hard edge per pixel. Blended across a whole face they left a dark
      // smear, so every fan had a black band over the eyes where the hair met the face.
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vSecond;\nvarying float vPart;")
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(vColor.rgb, vSecond, step(0.5, vPart));");
    };
  }

  dispose(): void {
    this.flashes.dispose();
    this.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    });
  }
}
