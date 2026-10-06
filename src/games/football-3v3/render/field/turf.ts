import * as THREE from "three";
import { TEAMS } from "../../teams";
import { grassTexture } from "./grass-texture";
import { digitAtlas, wordAtlas } from "./paint-glyphs";
import { PAINT_GLSL } from "./turf-paint.glsl";

/**
 * The turf under the lights, all in one shader. Its colour is grass with
 * a blade texture at two scales (so it never visibly repeats), wear
 * between the hashes, and the mowing stripes every five yards, whose
 * light and dark swap with the camera's side the way blades leaning
 * toward or away from a lens do. Over it goes the paint (turf-paint.glsl),
 * which lets the grass show through a little. The blades tilt the
 * surface normal up close.
 */
const GRASS_GLSL = /* glsl */ `
uniform sampler2D tGrass;
uniform vec3 uGrass;
uniform vec3 uApron;
varying vec2 vField;

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
}

/** The grass colour at field point p, the blade normal's tilt in g, and how rough. */
vec3 grassAt(vec2 p, vec3 eye, out vec2 tilt) {
  vec4 fine = texture2D(tGrass, p * 1.6);
  vec4 coarse = texture2D(tGrass, p * 0.23 + 0.37);
  tilt = (vec2(fine.g, fine.b) - 0.5) * 2.0;
  float macro = vnoise(p * 0.07) * 0.6 + vnoise(p * 0.21) * 0.4;
  float onField = step(abs(p.x), END_X + BORDER) * step(abs(p.y), HW + BORDER);
  vec3 c = mix(uApron, uGrass, onField);
  c *= (0.8 + 0.4 * fine.r) * (0.9 + 0.2 * coarse.a) * (0.92 + 0.16 * macro);
  // Mowing stripes, five yards wide: part fixed in the colour, part from the lean of the blades against the lens.
  float stripe = mod(floor((p.x + GOAL_X) / (5.0 * YD)), 2.0) * 2.0 - 1.0;
  vec3 view = normalize(vec3(p.x, 0.0, p.y) - eye);
  c *= 1.0 + onField * stripe * (0.06 + 0.07 * view.z);
  // Worn and drier between the hashes, most of all round midfield and the goal lines where the lines meet.
  float wear = (1.0 - smoothstep(HASH_Z, HASH_Z + 4.0, abs(p.y))) * (0.45 + 0.55 * exp(-pow(p.x / 14.0, 2.0)) + 0.6 * exp(-pow((abs(p.x) - GOAL_X + 4.0) / 6.0, 2.0)));
  c = mix(c, c * vec3(1.18, 1.0, 0.7), clamp(wear * coarse.r * 0.55, 0.0, 0.4));
  return c;
}
`;

export interface Turf {
  mesh: THREE.Mesh;
  dispose(): void;
}

/** The ground inside the bowl, `width` by `depth` metres, with the field painted in the middle. */
export function turf(width: number, depth: number, maxAnisotropy: number, low: boolean): Turf {
  const grass = grassTexture();
  const digits = digitAtlas();
  const words = wordAtlas([TEAMS[0].name.toUpperCase(), TEAMS[1].name.toUpperCase()]);
  for (const t of [grass, digits, words]) t.anisotropy = low ? 1 : maxAnisotropy;
  const linear = (hex: string) => new THREE.Color(hex);
  const uniforms = {
    tGrass: { value: grass },
    tDigits: { value: digits },
    tWords: { value: words },
    uGrass: { value: linear("#3f8232") },
    uApron: { value: linear("#2f6a2a") },
    uTeamA: { value: linear(TEAMS[0].color) },
    uTeamB: { value: linear(TEAMS[1].color) },
    uTrimA: { value: linear(TEAMS[0].trim) },
    uTrimB: { value: linear(TEAMS[1].dark) },
  };
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vField;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvField = (modelMatrix * vec4(transformed, 1.0)).xz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${PAINT_GLSL}\n${GRASS_GLSL}`)
      .replace(
        "#include <map_fragment>",
        `vec2 fw = max(fwidth(vField), vec2(1e-4)) * 1.15;
        vec2 tilt;
        vec3 grassCol = grassAt(vField, cameraPosition, tilt);
        vec4 paint = fieldPaint(vField, fw);
        float blade = texture2D(tGrass, vField * 1.6).r;
        diffuseColor.rgb = mix(grassCol, paint.rgb * (0.82 + 0.3 * blade), paint.a);`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.92 - 0.12 * blade, 0.7, paint.a);")
      .replace(
        "#include <normal_fragment_maps>",
        // Blades tilt the light up close and fade out with distance, where they would only shimmer.
        `#include <normal_fragment_maps>
        float near = 1.0 - smoothstep(0.02, 0.12, max(fw.x, fw.y));
        normal = normalize(normal + mat3(viewMatrix) * vec3(tilt.x, 0.0, tilt.y) * 0.35 * near * (1.0 - paint.a * 0.7));`,
      );
  };
  material.customProgramCacheKey = () => "fb-turf";
  const geo = new THREE.PlaneGeometry(width, depth);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return {
    mesh,
    dispose() {
      geo.dispose();
      material.dispose();
      for (const t of [grass, digits, words]) t.dispose();
    },
  };
}
