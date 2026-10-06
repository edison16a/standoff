import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { GRASS_TILE } from "./grass-texture";
import { LINE_WIDTH, pitchLines } from "./pitch-lines";

/** Metres per mown stripe: sixteen across the length. */
const STRIPE = (PITCH.halfLength * 2) / 16;

const lines = pitchLines();

const FRAGMENT_HEAD = /* glsl */ `
  varying vec3 vTurf;
  uniform vec4 uSegments[${lines.segments.length}];
  uniform vec4 uRings[${lines.rings.length}];
  uniform vec2 uField;
  uniform vec2 uPitch;
  uniform vec3 uLight;
  uniform vec3 uDark;
  uniform vec3 uRunOff;
  uniform vec3 uWorn;
  float turfHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float turfNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(turfHash(i), turfHash(i + vec2(1.0, 0.0)), f.x), mix(turfHash(i + vec2(0.0, 1.0)), turfHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float segmentDistance(vec2 p, vec4 s) {
    vec2 a = s.xy;
    vec2 ab = s.zw - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return length(p - a - ab * t);
  }
`;

/**
 * Builds the turf's colour from where each pixel lies, so it stays sharp
 * from the broadcast camera down to a boot: mown stripes whose shine
 * turns with the view as real stripes do, slow patches of colour, wear
 * in the goal mouths, blades from the grass tile, and the white lines
 * drawn from their exact shapes with smooth edges at any distance.
 */
const FRAGMENT_MAP = /* glsl */ `
  vec2 p = vTurf.xz;
  vec3 toEye = normalize(cameraPosition - vTurf);
  float far = length(cameraPosition - vTurf);
  vec3 coarse = texture2D(map, p * ${(1 / (GRASS_TILE * 5.3)).toFixed(4)} + 0.37).rgb;
  vec3 fine = texture2D(map, p * ${(1 / GRASS_TILE).toFixed(4)}).rgb;
  vec3 blades = mix(coarse, fine, 0.35 + 0.45 * (1.0 - smoothstep(4.0, 30.0, far))) / 0.62;
  bool onPitch = abs(p.x) < uPitch.x && abs(p.y) < uPitch.y;
  float stripe = mod(floor((p.x + uPitch.x) / ${STRIPE.toFixed(3)}), 2.0);
  float lean = stripe * 2.0 - 1.0;
  // Blades laid away from the eye shine; laid toward it they show their darker sides.
  vec3 grass = mix(uDark, uLight, stripe) * (1.0 + 0.1 * lean * toEye.x);
  grass = onPitch ? grass : uRunOff;
  float patches = turfNoise(p * 0.23) * 0.6 + turfNoise(p * 0.71 + 9.0) * 0.4;
  grass *= 0.88 + 0.24 * patches;
  float mouth = max(1.0 - length(vec2(abs(p.x) - uPitch.x + 1.2, p.y * 0.7)) / 3.6, 0.0);
  float centre = max(1.0 - length(p) / 1.6, 0.0);
  grass = mix(grass, uWorn, clamp((mouth * 0.55 + centre * 0.3) * (0.4 + patches), 0.0, 0.7));
  float d = 1e3;
  for (int i = 0; i < ${lines.segments.length}; i++) d = min(d, segmentDistance(p, uSegments[i]));
  for (int i = 0; i < ${lines.rings.length}; i++) {
    float r = length(p - uRings[i].xy) - uRings[i].z;
    d = min(d, uRings[i].w > 0.5 ? max(r + ${(LINE_WIDTH / 2).toFixed(3)}, 0.0) : abs(r));
  }
  float aa = max(fwidth(d), 1e-4);
  float paint = 1.0 - smoothstep(${(LINE_WIDTH / 2).toFixed(3)} - aa, ${(LINE_WIDTH / 2).toFixed(3)} + aa, d);
  paint *= step(abs(p.x), uField.x + 0.07) * step(abs(p.y), uField.y + 0.07);
  vec3 lineColour = vec3(0.78) * mix(1.0, blades.g, 0.25);
  diffuseColor.rgb *= mix(grass * blades, lineColour, paint);
`;

/**
 * The turf's material: a standard material lit like everything else,
 * with its colour worked out in the shader (above), the grass tile as
 * its bump, and painted lines a little smoother than the grass.
 */
export function turfMaterial(grass: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ map: grass, bumpMap: grass, bumpScale: 0.9, roughness: 0.9, metalness: 0 });
  const uniforms = {
    uSegments: { value: lines.segments.map((s) => new THREE.Vector4(s.ax, s.az, s.bx, s.bz)) },
    uRings: { value: lines.rings.map((r) => new THREE.Vector4(r.x, r.z, r.r, r.filled ? 1 : 0)) },
    uField: { value: new THREE.Vector2(lines.field.x, lines.field.z) },
    uPitch: { value: new THREE.Vector2(PITCH.halfLength, PITCH.halfWidth) },
    uLight: { value: new THREE.Color("#3f8f3a") },
    uDark: { value: new THREE.Color("#2f7a2e") },
    uRunOff: { value: new THREE.Color("#2a6a2a") },
    uWorn: { value: new THREE.Color("#6b6a3c") },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTurf;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTurf = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
      .replace("#include <map_fragment>", FRAGMENT_MAP)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, paint);");
  };
  material.customProgramCacheKey = () => "fifa-turf";
  return material;
}
