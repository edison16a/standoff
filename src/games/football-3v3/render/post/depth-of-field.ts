import * as THREE from "three";
import { FullScreen, passMaterial } from "./fullscreen";

/** The depth buffer's 0 to 1 back into metres from the lens. */
export const METRES = /* glsl */ `
  uniform float uNear;
  uniform float uFar;
  float metres(float d) { return (uNear * uFar) / (uFar - d * (uFar - uNear)); }
`;

/**
 * How soft a point is, 0 sharp to 1 fully blurred: sharp inside the band
 * either side of the subject, softening with distance past it, as a long
 * lens wide open throws the stands behind a player.
 */
export const CIRCLE = /* glsl */ `
  uniform float uFocus;
  uniform float uRange;
  float circle(float z) {
    float off = abs(z - uFocus) - uRange;
    return clamp(off / (uFocus * 0.8 + 2.0), 0.0, 1.0);
  }
`;

/**
 * Reads the half resolution blur back at full resolution by depth. Of
 * the four texels round a pixel, those whose own blur (kept in alpha) is
 * like the pixel's count most, so the soft stands beside a sharp player
 * never pick up a fringe of his colour.
 */
export const UPSAMPLE = /* glsl */ `
  uniform vec2 uDofTexel;
  vec3 softAt(sampler2D tex, vec2 uv, float coc) {
    vec2 p = uv / uDofTexel - 0.5;
    vec2 f = fract(p);
    vec2 base = (floor(p) + 0.5) * uDofTexel;
    vec3 sum = vec3(0.0);
    float total = 0.0;
    for (int j = 0; j < 2; j++) {
      for (int i = 0; i < 2; i++) {
        vec4 s = texture2D(tex, base + vec2(float(i), float(j)) * uDofTexel);
        float w = mix(1.0 - f.x, f.x, float(i)) * mix(1.0 - f.y, f.y, float(j)) / (0.02 + abs(s.a - coc));
        sum += s.rgb * w;
        total += w;
      }
    }
    return sum / max(total, 1e-5);
  }
`;

/**
 * A disc of samples round each pixel, at half resolution. A sample
 * counts only as far as its own blur reaches this pixel, so a sharp
 * player is never smeared over the soft stands behind him.
 */
const GATHER = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;
  uniform float uRadius;
  varying vec2 vUv;
  ${METRES}
  ${CIRCLE}
  const int TAPS = 24;
  void main() {
    float z = metres(texture2D(tDepth, vUv).r);
    float centre = circle(z);
    vec3 sum = texture2D(tColor, vUv).rgb;
    float total = 1.0;
    for (int i = 1; i < TAPS; i++) {
      float r = sqrt(float(i) / float(TAPS));
      float a = float(i) * 2.39996323;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uRadius * uTexel;
      float zs = metres(texture2D(tDepth, uv).r);
      float c = circle(zs);
      // A sample nearer the lens than this pixel spreads only by its own blur, so a sharp
      // player in front never bleeds a glowing outline into the soft stands behind him.
      float reach = zs < z - 0.5 ? c : max(c, centre * 0.6);
      float w = smoothstep(r - 0.15, r, reach);
      sum += texture2D(tColor, uv).rgb * w;
      total += w;
    }
    gl_FragColor = vec4(sum / total, centre);
  }
`;

/**
 * Depth of field for the replays and the trophy ceremony only. Live
 * play stays sharp end to end, as a broadcast camera is, and pays
 * nothing for it.
 */
export class DepthOfField {
  readonly target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly material = passMaterial(GATHER, {
    tColor: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uRadius: { value: 8 },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uFocus: { value: 10 },
    uRange: { value: 2 },
  });

  constructor(private readonly quad: FullScreen) {}

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width / 2));
    const h = Math.max(1, Math.round(height / 2));
    if (w !== this.target.width || h !== this.target.height) this.target.setSize(w, h);
  }

  /** `focus` and `range` in metres; `radius` is the widest blur as a share of the picture's height. */
  render(renderer: THREE.WebGLRenderer, color: THREE.Texture, depth: THREE.Texture, camera: THREE.PerspectiveCamera, focus: number, range: number, radius: number): void {
    const u = this.material.uniforms;
    u.tColor!.value = color;
    u.tDepth!.value = depth;
    (u.uTexel!.value as THREE.Vector2).set(1 / this.target.width, 1 / this.target.height);
    u.uRadius!.value = radius * this.target.height;
    u.uNear!.value = camera.near;
    u.uFar!.value = camera.far;
    u.uFocus!.value = focus;
    u.uRange!.value = range;
    this.quad.draw(renderer, this.material, this.target);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
  }
}
