import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Slot } from "@/games/blade-clash/players";
import { seeded } from "../kit/textures";
import { FESTIVE, PLAYER_COLOURS } from "../player-colours";

/** Where one fan sits and which way they face (toward the middle of the arena). */
export interface Seat {
  x: number;
  y: number;
  z: number;
  facing: number;
}

const SKIN = [0xf1c6a6, 0xd9a47e, 0xa8714a, 0x6d4630];
const NEUTRAL = [0x2b2d42, 0xe9ecef, 0x6c757d, 0x1d3557, 0x8d99ae, 0x7a4a24];

/**
 * The moves live in the vertex shader, so a thousand fans cost nothing on
 * the processor: each sways on their own, and when the crowd roars they
 * jump with their arms up, the scorer's supporters highest. Arms swing up
 * about the shoulder; everything else just rises.
 */
const MOVES = /* glsl */ `
  attribute vec4 fan;
  uniform float uTime;
  uniform float uCheerAt;
  uniform float uCheerSide;
  uniform float uCheerStrength;
  uniform float uArms;
`;
const MOVE_BODY = /* glsl */ `
  #include <begin_vertex>
  float local = uTime - uCheerAt - fan.z;
  float partisan = (uCheerSide < 0.5 || fan.y < 0.5) ? 0.7 : (abs(fan.y - uCheerSide) < 0.5 ? 1.0 : 0.15);
  float excite = local > 0.0 ? max(0.0, 1.0 - local / 2600.0) * uCheerStrength * partisan : 0.0;
  float bounce = excite > 0.0 ? abs(sin(local / 150.0 + fan.x)) * 0.12 * excite : 0.0;
  float rise = min(1.0, excite * 2.5) * 0.28 + bounce;
  float sway = sin(uTime / 900.0 + fan.x) * 0.025;
  if (uArms > 0.5) {
    // Arms pivot at the shoulders, from hanging down to straight up.
    float lift = min(1.0, excite * 3.0) * (2.6 + sin(local / 120.0 + fan.x) * 0.3);
    vec3 pivot = vec3(0.0, 0.56, 0.0);
    vec3 p = transformed - pivot;
    float c = cos(lift);
    float s = sin(lift);
    transformed = pivot + vec3(p.x, p.y * c + p.z * s, -p.y * s + p.z * c);
  }
  transformed.y += rise;
  transformed.x += sway * transformed.y;
`;

/**
 * Everyone in the stands, as three instanced meshes (bodies, heads, arms)
 * sharing one set of seats.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private readonly uniforms = {
    uTime: { value: 0 },
    uCheerAt: { value: -1e9 },
    uCheerSide: { value: 0 },
    uCheerStrength: { value: 0 },
  };
  private readonly materials: THREE.MeshStandardMaterial[] = [];

  constructor(seats: readonly Seat[], light: number) {
    const rand = seeded(4321);
    const fans = seats.map(() => ({ side: (rand() < 0.3 ? 1 : rand() < 0.45 ? 2 : 0) as 0 | Slot, phase: rand() * Math.PI * 2, delay: rand() * 280 }));
    const shirts = new THREE.Color();
    const skins = new THREE.Color();
    const body = new THREE.CapsuleGeometry(0.17, 0.3, 4, 8).scale(1.05, 1, 0.7).translate(0, 0.38, 0);
    const head = new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.72, 0.01);
    const arms = mergeGeometries([-0.2, 0.2].map((x) => new THREE.CapsuleGeometry(0.045, 0.4, 3, 6).translate(x, 0.33, 0.02)))!;
    const parts = [
      { geometry: body, arms: false, colour: (i: number) => shirts.set(this.shirt(fans[i]!.side, rand)).lerp(new THREE.Color(0x777777), 0.3).multiplyScalar(light) },
      { geometry: head, arms: false, colour: () => skins.set(SKIN[Math.floor(rand() * SKIN.length)]!).multiplyScalar(light) },
      { geometry: arms, arms: true, colour: (i: number) => shirts.set(this.shirt(fans[i]!.side, rand)).multiplyScalar(light * 0.9) },
    ];
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(seats.length * 4), 4);
    fans.forEach((fan, i) => attribute.setXYZW(i, fan.phase, fan.side, fan.delay, 0));
    const m = new THREE.Matrix4();
    for (const part of parts) {
      part.geometry.setAttribute("fan", attribute);
      const material = new THREE.MeshStandardMaterial({ roughness: 0.85 });
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, this.uniforms, { uArms: { value: part.arms ? 1 : 0 } });
        shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${MOVES}`).replace("#include <begin_vertex>", MOVE_BODY);
      };
      // Each part compiles its own program, since the arms swing and the rest does not.
      material.customProgramCacheKey = () => `crowd-${part.arms ? "arms" : "body"}`;
      this.materials.push(material);
      const mesh = new THREE.InstancedMesh(part.geometry, material, seats.length);
      seats.forEach((seat, i) => {
        mesh.setMatrixAt(i, m.makeRotationY(seat.facing).setPosition(seat.x, seat.y, seat.z));
        mesh.setColorAt(i, part.colour(i));
      });
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  /** The crowd erupts: `side` is who they cheer, whose fans go hardest. */
  roar(t: number, side: Slot | null, strength = 1): void {
    this.uniforms.uCheerAt.value = t;
    this.uniforms.uCheerSide.value = side ?? 0;
    this.uniforms.uCheerStrength.value = strength;
  }

  update(t: number): void {
    this.uniforms.uTime.value = t;
  }

  dispose(): void {
    for (const child of this.group.children) (child as THREE.InstancedMesh).geometry.dispose();
    for (const material of this.materials) material.dispose();
  }

  private shirt(side: 0 | Slot, rand: () => number): number {
    if (side) return PLAYER_COLOURS[side];
    return rand() < 0.5 ? FESTIVE[Math.floor(rand() * FESTIVE.length)]! : NEUTRAL[Math.floor(rand() * NEUTRAL.length)]!;
  }
}
