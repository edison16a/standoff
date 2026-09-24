import { Color, CustomBlending, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial } from "three";
import { BLADES, type BladeId } from "../blades";

/** The trail's look per blade: 0 smooth, 1 bolt, 2 flame, 3 spectrum, 4 shimmer. */
const MODES = { smooth: 0, bolt: 1, flame: 2, spectrum: 3, shimmer: 4 } as const;

const VERTEX = /* glsl */ `
  attribute float aAlong;
  attribute float aSide;
  varying float vAlong;
  varying float vSide;
  void main() {
    vAlong = aAlong;
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uGlow;
  uniform vec3 uPlayer;
  uniform float uMode;
  uniform float uTime;
  uniform float uOpacity;
  varying float vAlong;
  varying float vSide;

  vec3 hue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float across = abs(vSide);
    float t = vAlong;
    float core = smoothstep(0.42, 0.0, across);
    float glow = pow(1.0 - across, 1.5);
    vec3 glowColour = uGlow;
    float flicker = 1.0;
    if (uMode > 2.5 && uMode < 3.5) glowColour = hue(fract(t * 0.9 - uTime * 0.5));
    if (uMode > 1.5 && uMode < 2.5) {
      flicker = 0.7 + 0.3 * sin(t * 38.0 - uTime * 28.0 + vSide * 5.0);
      glowColour = mix(glowColour, uCore, 0.35 * (1.0 - t));
    }
    if (uMode > 0.5 && uMode < 1.5) flicker = 0.75 + 0.25 * step(0.5, hash(vec2(floor(uTime * 24.0), floor(t * 12.0))));
    if (uMode > 3.5) {
      float glitter = step(0.93, hash(floor(vec2(t * 70.0, vSide * 4.0) + floor(uTime * 12.0))));
      core += glitter * 0.8 * (1.0 - t);
    }
    // The outer rim carries the player's colour, so four blades of one style still tell apart.
    float rim = smoothstep(0.55, 0.9, across);
    float fade = pow(1.0 - t, 1.3);
    float g = glow * 0.8 * fade * flicker;
    float c = core * fade;
    // Premultiplied: the glow covers the wood in its own colour, and the core adds light on top.
    vec3 colour = mix(glowColour, uPlayer, rim) * g + uCore * c * 1.5;
    gl_FragColor = vec4(colour, clamp(g + c, 0.0, 1.0)) * uOpacity;
  }
`;

export function trailMaterial(blade: BladeId, player: string): ShaderMaterial {
  const look = BLADES[blade];
  return new ShaderMaterial({
    uniforms: {
      uCore: { value: new Color(look.core) },
      uGlow: { value: new Color(look.glow) },
      uPlayer: { value: new Color(player) },
      uMode: { value: MODES[look.motion] },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
  });
}

export function setTrailLook(material: ShaderMaterial, blade: BladeId, player: string): void {
  const look = BLADES[blade];
  material.uniforms.uCore!.value.set(look.core);
  material.uniforms.uGlow!.value.set(look.glow);
  material.uniforms.uPlayer!.value.set(player);
  material.uniforms.uMode!.value = MODES[look.motion];
}
