import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { merge, paint } from "../models/geo";

export interface Seat {
  x: number;
  y: number;
  z: number;
  /** Which way the fan faces, radians about y. */
  turn: number;
  /** Leaning red or blue, for their shirt. */
  side: number;
}

const SKINS = ["#f1c9a5", "#e0ac84", "#c68e67", "#8d5c3e", "#5b3a29", "#f4d6c2"];
const NEUTRAL = ["#f5f5f5", "#222428", "#3b3f4a", "#f2c230", "#7c3aed", "#10b981"];

/**
 * The crowd: thousands of simple fans drawn in one call. Each is a
 * torso, a head and two arms; the vertex shader bobs them, and on a
 * goal it makes them jump and throw their arms up, each fan on their
 * own beat so the stands ripple rather than march.
 */
export class Crowd {
  readonly mesh: THREE.InstancedMesh;
  private readonly uniforms = { uTime: { value: 0 }, uExcite: { value: 0.1 } };
  private excite = 0.1;
  private target = 0.1;

  constructor(seats: readonly Seat[], teamColours: readonly [string, string], seed = 11) {
    // Seen from the far side of the pitch, a few boxes and a ball read as a person; thousands stay cheap.
    const parts = [
      paint(new THREE.BoxGeometry(0.4, 0.62, 0.26), "#ffffff", { at: [0, 0.42, 0] }),
      paint(new THREE.IcosahedronGeometry(0.12, 0), "#ff00ff", { at: [0, 0.88, 0] }),
      paint(new THREE.BoxGeometry(0.11, 0.42, 0.11), "#00ffff", { at: [-0.26, 0.5, 0.02] }),
      paint(new THREE.BoxGeometry(0.11, 0.42, 0.11), "#00ffff", { at: [0.26, 0.5, 0.02] }),
    ];
    const geometry = merge(parts);
    // The paint marks the parts: magenta is the head, cyan the arms. Turn those into flags for the shader.
    const colours = geometry.getAttribute("color") as THREE.BufferAttribute;
    const head = new Float32Array(colours.count);
    const arm = new Float32Array(colours.count);
    for (let i = 0; i < colours.count; i++) {
      head[i] = colours.getX(i) > 0.9 && colours.getY(i) < 0.1 ? 1 : 0;
      arm[i] = colours.getX(i) < 0.1 && colours.getY(i) > 0.9 ? 1 : 0;
    }
    geometry.deleteAttribute("color");
    geometry.setAttribute("aHead", new THREE.BufferAttribute(head, 1));
    geometry.setAttribute("aArm", new THREE.BufferAttribute(arm, 1));
    const phase = new Float32Array(seats.length);
    const skin = new Float32Array(seats.length * 3);
    const rng = new Rng(seed);
    const material = new THREE.MeshLambertMaterial();
    material.onBeforeCompile = (shader) => this.patch(shader);
    material.customProgramCacheKey = () => "fifa-crowd";
    this.mesh = new THREE.InstancedMesh(geometry, material, seats.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    seats.forEach((seat, i) => {
      const scale = 0.9 + rng.next() * 0.2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), seat.turn + rng.range(-0.2, 0.2));
      s.set(scale, scale, scale);
      m.compose(new THREE.Vector3(seat.x + rng.range(-0.08, 0.08), seat.y, seat.z), q, s);
      this.mesh.setMatrixAt(i, m);
      const fan = rng.next();
      const shirt = fan < 0.72 ? teamColours[seat.side > 0 ? 1 : 0] : rng.pick(NEUTRAL);
      c.set(shirt).multiplyScalar(0.75 + rng.next() * 0.35);
      this.mesh.setColorAt(i, c);
      c.set(rng.pick(SKINS));
      skin.set([c.r, c.g, c.b], i * 3);
      phase[i] = rng.next() * Math.PI * 2;
    });
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    geometry.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 3));
    this.mesh.frustumCulled = false;
  }

  private patch(shader: THREE.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.uTime = this.uniforms.uTime;
    shader.uniforms.uExcite = this.uniforms.uExcite;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aHead;\nattribute float aArm;\nattribute float aPhase;\nattribute vec3 aSkin;\nuniform float uTime;\nuniform float uExcite;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float beat = uTime * (3.0 + 5.0 * uExcite) + aPhase;
        float hop = max(0.0, sin(beat)) * (0.02 + 0.32 * uExcite * uExcite);
        float wave = uExcite * (0.55 + 0.45 * sin(beat * 1.3 + 1.0));
        transformed.y += hop + aArm * wave * 0.42;
        transformed.x += aArm * sign(transformed.x) * wave * -0.1;`,
      )
      .replace(
        "#include <color_vertex>",
        `#include <color_vertex>
        #ifdef USE_INSTANCING_COLOR
          vColor.xyz = mix(instanceColor.xyz, aSkin, aHead);
        #endif`,
      );
  }

  /** 0 idle murmur to 1 a goal. The crowd eases toward it. */
  setExcitement(level: number): void {
    this.target = level;
  }

  update(dt: number, time: number): void {
    this.excite += (this.target - this.excite) * (1 - Math.exp(-dt * (this.target > this.excite ? 6 : 1.2)));
    this.uniforms.uTime.value = time;
    this.uniforms.uExcite.value = this.excite;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}
