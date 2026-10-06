import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { fanGeometry } from "./fan-geometry";
import type { Seat } from "./stand-layout";

const SKINS = ["#f1c9a5", "#e0ac84", "#c68e67", "#8d5c3e", "#5b3a29", "#f4d6c2"];
/** Coats and tops for a cold night: mostly dark, some in the club's colours, a few bright. */
const NEUTRAL = ["#1d2027", "#2b2f38", "#3d424d", "#4a3b2f", "#5b5f68", "#d9d9d4", "#1f2a40", "#6b2a2a"];
const HAIR = ["#16110d", "#2a1c12", "#3b2a1c", "#6b4a2b", "#b08a5a", "#8a8a8a"];

/**
 * The crowd: thousands of simple fans (fan-geometry.ts) drawn in one
 * call; the vertex shader bobs them, and on a
 * goal it makes them jump and throw their arms up, each fan on their
 * own beat so the stands ripple rather than march.
 */
export class Crowd {
  readonly mesh: THREE.InstancedMesh;
  private readonly uniforms = { uTime: { value: 0 }, uExcite: { value: 0.1 } };
  private excite = 0.1;
  private target = 0.1;

  constructor(seats: readonly Seat[], teamColours: readonly [string, string], seed = 11) {
    const geometry = fanGeometry();
    const phase = new Float32Array(seats.length);
    const skin = new Float32Array(seats.length * 3);
    const hair = new Float32Array(seats.length * 3);
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
      // The back rows sit in the roof's shadow, a little darker.
      const shade = 1 - seat.height * 0.3;
      const fan = rng.next();
      const top = fan < 0.5 ? teamColours[seat.side > 0 ? 1 : 0] : rng.pick(NEUTRAL);
      c.set(top).multiplyScalar((0.55 + rng.next() * 0.35) * shade);
      this.mesh.setColorAt(i, c);
      c.set(rng.pick(SKINS)).multiplyScalar(0.85 * shade);
      skin.set([c.r, c.g, c.b], i * 3);
      c.set(rng.pick(HAIR)).multiplyScalar(shade);
      hair.set([c.r, c.g, c.b], i * 3);
      phase[i] = rng.next() * Math.PI * 2;
    });
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    geometry.setAttribute("aSkin", new THREE.InstancedBufferAttribute(skin, 3));
    geometry.setAttribute("aHairColour", new THREE.InstancedBufferAttribute(hair, 3));
    this.mesh.frustumCulled = false;
  }

  private patch(shader: THREE.WebGLProgramParametersWithUniforms): void {
    shader.uniforms.uTime = this.uniforms.uTime;
    shader.uniforms.uExcite = this.uniforms.uExcite;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aHead;\nattribute float aHair;\nattribute float aArm;\nattribute float aPhase;\nattribute vec3 aSkin;\nattribute vec3 aHairColour;\nuniform float uTime;\nuniform float uExcite;",
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
          vColor.xyz = mix(mix(instanceColor.xyz, aSkin, aHead), aHairColour, aHair);
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
