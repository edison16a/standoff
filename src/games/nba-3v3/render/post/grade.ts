import * as THREE from "three";
import { CIRCLE, VIEW_DEPTH } from "./depth-of-field";
import { passMaterial } from "./fullscreen";

/**
 * The last pass, straight to the screen: the depth of field blend, the
 * bloom, white balance, the ACES filmic curve (the same fit three.js
 * uses), sRGB encoding, then the grade in display space (saturation, a
 * gentle S curve, lifted blacks), a vignette and a breath of noise so
 * the dark stands never band.
 */
const FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform sampler2D tDof;
  uniform sampler2D tDepth;
  uniform float uExposure;
  uniform float uBloom;
  uniform float uVignette;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uLift;
  uniform float uDof;
  uniform float uAspect;
  uniform float uSeed;
  uniform vec3 uBalance;
  varying vec2 vUv;
  ${VIEW_DEPTH}
  ${CIRCLE}

  vec3 fit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 aces(vec3 c) {
    const mat3 inputM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
    const mat3 outputM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
    c = inputM * (c / 0.6);
    c = outputM * fit(c);
    return clamp(c, 0.0, 1.0);
  }
  vec3 srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec3 c = texture2D(tScene, vUv).rgb;
    if (uDof > 0.001) {
      float blur = circle(metres(texture2D(tDepth, vUv).r));
      vec4 soft = texture2D(tDof, vUv);
      c = mix(c, soft.rgb, smoothstep(0.03, 0.4, blur) * uDof);
    }
    c += texture2D(tBloom, vUv).rgb * uBloom;
    c = aces(max(c, vec3(0.0)) * uBalance * uExposure);
    c = srgb(c);
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = clamp(mix(vec3(l), c, uSaturation), 0.0, 1.0);
    c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
    c = c * (1.0 - uLift) + uLift;
    vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
    c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(d) * 1.25);
    c += (hash(gl_FragCoord.xy + uSeed) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;

export type GradeMaterial = THREE.ShaderMaterial;

export function gradeMaterial(): GradeMaterial {
  return passMaterial(FRAGMENT, {
    tScene: { value: null },
    tBloom: { value: null },
    tDof: { value: null },
    tDepth: { value: null },
    uExposure: { value: 1 },
    uBloom: { value: 0.1 },
    uVignette: { value: 0.2 },
    uSaturation: { value: 1 },
    uContrast: { value: 0 },
    uLift: { value: 0 },
    uDof: { value: 0 },
    uAspect: { value: 16 / 9 },
    uSeed: { value: 0 },
    uBalance: { value: new THREE.Vector3(1, 1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uFocus: { value: 5 },
    uRange: { value: 1 },
  });
}
