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
  uniform vec3 uAccent;
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

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    return mix(hash(vec2(i, 3.1)), hash(vec2(i + 1.0, 3.1)), f * f * (3.0 - 2.0 * f));
  }

  void main() {
    float t = vAlong;
    float across = abs(vSide);
    float flicker = 1.0;
    // Flame and venom: tongues that swell and shrink as they run down the trail.
    if (uMode > 1.5 && uMode < 2.5) {
      float tongue = noise(t * 11.0 - uTime * 9.0 + sign(vSide) * 2.3);
      across /= 0.45 + 0.9 * tongue;
      flicker = 0.75 + 0.35 * tongue;
    }
    // Two tones: the accent close to the core, the style's own colour further out.
    vec3 glowColour = mix(uGlow, uAccent, exp(-across * across * 9.0) * 0.55);
    // Lightning crackles: whole bands of the bolt blink on and off.
    if (uMode > 0.5 && uMode < 1.5) flicker = 0.6 + 0.4 * step(0.35, hash(vec2(floor(uTime * 24.0), floor(t * 10.0))));
    if (uMode > 2.5 && uMode < 3.5) glowColour = hue(fract(t * 0.9 - uTime * 0.5)) * 1.2;
    float core = smoothstep(0.2, 0.0, across);
    // A soft falloff across the width, so the glow reads as light rather than a flat band.
    float glow = exp(-across * across * 3.5);
    // Ice and gold shimmer: the glow ripples brighter and dimmer along the blade.
    if (uMode > 3.5) flicker = 0.8 + 0.3 * sin(t * 40.0 - uTime * 18.0);
    // A thin edge in the player's colour, so four blades of one style still tell apart.
    float rim = smoothstep(0.5, 0.75, across) * smoothstep(1.0, 0.78, across);
    float fade = pow(1.0 - t, 1.2);
    float g = glow * fade * flicker;
    float c = core * fade * (1.0 - 0.5 * t);
    float r = rim * fade * 0.45;
    // Premultiplied: the glow covers the wood in its own colour, and the hot core adds light
    // brighter than white on top, which the glow pass turns into a halo.
    vec3 colour = glowColour * g * 1.7 + uPlayer * r + uCore * c * 1.6;
    gl_FragColor = vec4(colour, clamp(g * 0.6 + r + c, 0.0, 1.0)) * uOpacity;
    // Without the glow pass the trail draws straight to the screen, so it must tone map and encode itself.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function trailMaterial(blade: BladeId, player: string): ShaderMaterial {
  const look = BLADES[blade];
  return new ShaderMaterial({
    uniforms: {
      uCore: { value: new Color(look.core) },
      uGlow: { value: new Color(look.glow) },
      uAccent: { value: new Color(look.accent) },
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
  material.uniforms.uAccent!.value.set(look.accent);
  material.uniforms.uPlayer!.value.set(player);
  material.uniforms.uMode!.value = MODES[look.motion];
}
