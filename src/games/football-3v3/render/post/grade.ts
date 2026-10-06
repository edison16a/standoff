import * as THREE from "three";
import { CIRCLE, METRES } from "./depth-of-field";
import { passMaterial } from "./fullscreen";

/**
 * The last pass, to the screen: the depth of field blend, the bloom, the
 * white balance and exposure, the ACES filmic curve (the same fit three
 * uses), sRGB encoding, then a broadcast camera's light edge crispening
 * and the grade in display space: saturation, a gentle S curve, lifted
 * blacks, a vignette, and a breath of noise so the night sky never bands.
 */
const FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tDof;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;
  uniform float uExposure;
  uniform float uBloom;
  uniform float uVignette;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uLift;
  uniform float uDof;
  uniform float uSharpen;
  uniform float uAspect;
  uniform float uSeed;
  uniform vec3 uBalance;
  varying vec2 vUv;
  ${METRES}
  ${CIRCLE}

  vec3 fit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 aces(vec3 c) {
    const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    return clamp(outM * fit(inM * (c / 0.6)), 0.0, 1.0);
  }
  vec3 srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  vec3 scene(vec2 uv) {
    return max(texture2D(tScene, uv).rgb, vec3(0.0));
  }
  vec3 display(vec3 c) {
    return srgb(aces(c * uBalance * uExposure));
  }

  void main() {
    vec3 c = scene(vUv);
    float blur = 0.0;
    if (uDof > 0.001) {
      blur = smoothstep(0.03, 0.4, circle(metres(texture2D(tDepth, vUv).r))) * uDof;
      c = mix(c, texture2D(tDof, vUv).rgb, blur);
    }
    vec3 glow = texture2D(tBloom, vUv).rgb * uBloom;
    vec3 col = display(c + glow);
    if (uSharpen > 0.001) {
      // Neighbours through the same curve, so the crispening never rings round the floodlights.
      vec3 n = display(scene(vUv + vec2(uTexel.x, 0.0)) + glow) + display(scene(vUv - vec2(uTexel.x, 0.0)) + glow)
        + display(scene(vUv + vec2(0.0, uTexel.y)) + glow) + display(scene(vUv - vec2(0.0, uTexel.y)) + glow);
      col = clamp(col + (col - n * 0.25) * uSharpen * (1.0 - blur), 0.0, 1.0);
    }
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = clamp(mix(vec3(l), col, uSaturation), 0.0, 1.0);
    col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);
    col = col * (1.0 - uLift) + uLift;
    vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
    col *= 1.0 - uVignette * smoothstep(0.3, 1.05, length(d) * 1.2);
    col += (hash(gl_FragCoord.xy + uSeed) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function gradeMaterial(): THREE.ShaderMaterial {
  return passMaterial(FRAGMENT, {
    tScene: { value: null },
    tBloom: { value: null },
    tDof: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1 },
    uBloom: { value: 0.1 },
    uVignette: { value: 0.2 },
    uSaturation: { value: 1 },
    uContrast: { value: 0 },
    uLift: { value: 0 },
    uDof: { value: 0 },
    uSharpen: { value: 0 },
    uAspect: { value: 16 / 9 },
    uSeed: { value: 0 },
    uBalance: { value: new THREE.Vector3(1, 1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uFocus: { value: 10 },
    uRange: { value: 2 },
  });
}
