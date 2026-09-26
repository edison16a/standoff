import * as THREE from "three";
import type { MeshBuilder, V3 } from "../../kit/mesh-builder";
import type { LookKit } from "../model/look-kit";
import { BLADE_START } from "./steel-blades";

const ALONG_X: V3 = [0, 0, -Math.PI / 2];

/**
 * A glow that always faces the camera: a strip along the blade that turns
 * about the blade's axis toward whichever view is drawing it, so the
 * blade looks equally thick from both halves of the split screen.
 */
const HALO_VERTEX = /* glsl */ `
  uniform float width;
  varying vec2 vAcross;
  void main() {
    vec3 axis = normalize((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
    vec4 world = modelMatrix * vec4(position.x, 0.0, 0.0, 1.0);
    vec3 toCamera = normalize(cameraPosition - world.xyz);
    vec3 across = normalize(cross(axis, toCamera));
    // The ends round off: the strip reaches past the core's tip by its own width.
    world.xyz += across * position.y * width + axis * position.z * width;
    vAcross = vec2(position.y, uv.x);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const HALO_FRAGMENT = /* glsl */ `
  uniform vec3 color;
  uniform float strength;
  varying vec2 vAcross;
  void main() {
    float d = abs(vAcross.x);
    float glow = exp(-d * d * 5.0) * 0.85 + exp(-d * d * 40.0) * 0.6;
    float ends = smoothstep(0.0, 0.06, vAcross.y) * smoothstep(1.0, 0.94, vAcross.y);
    gl_FragColor = vec4(color * glow * ends * strength, 1.0);
  }
`;

/** The halo strip: x along the blade, y across it from -1 to 1, z pushing the ends out. */
function haloGeometry(from: number, to: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const rows = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    // The first and last rows sit on the ends and are pushed out along the blade.
    const x = from + (to - from) * u;
    const push = i === 0 ? -1 : i === rows ? 1 : 0;
    positions.push(x, -1, push, x, 1, push);
    uvs.push(u, 0, u, 1);
    if (i < rows) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  return geometry;
}

export interface EnergyBlade {
  /** The glowing parts, added to the sword bone as they are. */
  glow: THREE.Group;
  /** Called every frame: the blade shimmers, and swings flare it. */
  shimmer(t: number, swing: number): void;
}

/**
 * The Star Knight's weapon: a ribbed silver hilt with an emitter, and a
 * blade of light, a white hot core inside a halo in the player's colour.
 * The hilt merges with the rest of the model; the light stays separate.
 */
export function energyBlade(b: MeshBuilder, kit: LookKit, length: number, colour: THREE.ColorRepresentation): EnergyBlade {
  const silver = kit.metal(0xc9d1dc, 0.22);
  const dark = kit.metal(0x2a2f3a, 0.4);
  b.cylinder(0.019, 0.019, 0.24, silver, [-0.03, 0, 0], ALONG_X, 18);
  for (let i = 0; i < 6; i++) b.cylinder(0.0205, 0.0205, 0.012, dark, [-0.12 + i * 0.03, 0, 0], ALONG_X, 18);
  // The emitter: a flared shroud with a notch, and a glowing ring where the light leaves it.
  b.cylinder(0.026, 0.02, 0.05, silver, [0.075, 0, 0], ALONG_X, 18);
  b.box(0.03, 0.012, 0.014, dark, [0.08, 0.025, 0], [0, 0, 0], 0.003);
  b.add(new THREE.TorusGeometry(0.018, 0.004, 6, 20), kit.glow(colour, 3), [0.1, 0, 0], [0, Math.PI / 2, 0]);
  // The switch and a pommel cap.
  b.box(0.02, 0.01, 0.012, kit.glow(colour, 2), [0.02, 0.021, 0], [0, 0, 0], 0.003);
  b.cylinder(0.022, 0.017, 0.02, dark, [-0.16, 0, 0], ALONG_X, 18);

  const glow = new THREE.Group();
  const coreLength = length - BLADE_START - 0.012;
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, coreLength, 4, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), toneMapped: false }));
  core.rotation.z = -Math.PI / 2;
  core.position.x = BLADE_START + coreLength / 2;
  const tint = new THREE.Color(colour);
  const halo = new THREE.Mesh(
    haloGeometry(BLADE_START, length),
    new THREE.ShaderMaterial({
      uniforms: { color: { value: tint.clone().multiplyScalar(2.2) }, width: { value: 0.05 }, strength: { value: 1 } },
      vertexShader: HALO_VERTEX,
      fragmentShader: HALO_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  halo.frustumCulled = false;
  halo.renderOrder = 3;
  // A thin sheath of the colour right round the core, so it reads in colour even edge on.
  const sheath = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.017, coreLength, 4, 12),
    new THREE.MeshBasicMaterial({ color: tint.clone().multiplyScalar(1.5), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  sheath.rotation.z = -Math.PI / 2;
  sheath.position.x = core.position.x;
  glow.add(core, sheath, halo);
  const uniforms = (halo.material as THREE.ShaderMaterial).uniforms;
  return {
    glow,
    shimmer(t, swing) {
      // A fast shimmer, a little wider and brighter while the blade is moving.
      const flicker = 1 + Math.sin(t * 0.09) * 0.03 + Math.sin(t * 0.23) * 0.02;
      uniforms.width!.value = (0.05 + 0.02 * swing) * flicker;
      uniforms.strength!.value = (1 + 0.35 * swing) * flicker;
    },
  };
}
