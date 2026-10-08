import * as THREE from "three";
import { FINITE } from "./finite";
import { FullScreen, passMaterial } from "./fullscreen";

/** Turns the depth buffer's 0 to 1 back into metres from the camera. */
export const VIEW_DEPTH = /* glsl */ `
  uniform float uNear;
  uniform float uFar;
  float metres(float d) { return (uNear * uFar) / (uFar - d * (uFar - uNear)); }
`;

/**
 * How blurred a point is, 0 sharp to 1 fully soft: zero inside the
 * focused band either side of the subject, rising with distance from
 * it, as a long lens wide open throws the arena behind a player.
 */
export const CIRCLE = /* glsl */ `
  uniform float uFocus;
  uniform float uRange;
  float circle(float z) {
    float off = abs(z - uFocus) - uRange;
    return clamp(off / (uFocus * 0.9 + 1.0), 0.0, 1.0);
  }
`;

/**
 * Gathers a disc of samples round each pixel at half resolution. A
 * sample counts only as far as its own blur reaches this pixel, so a
 * sharp player is not smeared over the blurred stands behind him. A bad
 * sample (NaN or infinity) counts for nothing: summed in, one bad pixel
 * would spoil every pixel whose disc reaches it, a thick black stroke.
 * A bad pixel itself is filled from its neighbours, for the grade to use.
 */
const GATHER = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 uTexel;
  uniform float uRadius;
  varying vec2 vUv;
  ${VIEW_DEPTH}
  ${CIRCLE}
  ${FINITE}
  const int TAPS = 28;
  void main() {
    float centre = circle(metres(texture2D(tDepth, vUv).r));
    vec3 own = texture2D(tColor, vUv).rgb;
    bool hole = nonFinite(own);
    float total = hole ? 0.0 : 1.0;
    vec3 sum = finite(own) * total;
    for (int i = 1; i < TAPS; i++) {
      float r = sqrt(float(i) / float(TAPS));
      float a = float(i) * 2.39996323;
      vec2 o = vec2(cos(a), sin(a)) * r * uRadius * uTexel;
      vec2 uv = vUv + o;
      float c = circle(metres(texture2D(tDepth, uv).r));
      // The sample reaches here if its own blur is at least this far out, or this pixel is blurred over it.
      float w = smoothstep(r - 0.15, r, max(c, centre * 0.6));
      // A bad pixel here is filled from its nearest neighbours, even where all is sharp.
      if (hole && r < 0.4) w = 1.0;
      vec3 tap = texture2D(tColor, uv).rgb;
      if (nonFinite(tap)) w = 0.0;
      sum += finite(tap) * w;
      total += w;
    }
    gl_FragColor = vec4(sum / max(total, 1e-4), centre);
  }
`;

/**
 * Depth of field for the replays and the trophy ceremony only: the
 * subject sharp, the stands and the far end soft. In live play the
 * broadcast camera keeps everything sharp, as a real one does, and this
 * costs nothing.
 */
export class DepthOfField {
  readonly target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  private readonly material = passMaterial(GATHER, {
    tColor: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uRadius: { value: 10 },
    uNear: { value: 0.1 },
    uFar: { value: 100 },
    uFocus: { value: 5 },
    uRange: { value: 1 },
  });

  constructor(private readonly quad: FullScreen) {}

  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width / 2));
    const h = Math.max(1, Math.round(height / 2));
    if (w !== this.target.width || h !== this.target.height) this.target.setSize(w, h);
  }

  /** `focus` and `range` in metres; `radius` is the widest blur, as a share of the picture's height. */
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
