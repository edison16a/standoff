import * as THREE from "three";
import { FINITE } from "./finite";
import { FullScreen, passMaterial } from "./fullscreen";

/** Halvings below the picture's own size: half, a quarter, down to a thirty second. */
const LEVELS = 5;

/**
 * Thirteen taps in five overlapping boxes, weighted as in a filmic
 * bloom. On the first step down each box is averaged by its brightness
 * (a Karis average), so one blazing pixel, a glint on the rim, cannot
 * flicker into a blob as it crosses pixels. Every tap is cleaned first,
 * so a bad pixel (NaN or infinity) cannot spread through the levels.
 */
const DOWN = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 uTexel;
  uniform float uFirst;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;
  ${FINITE}
  vec3 tap(vec2 o) { return finite(texture2D(tInput, vUv + o * uTexel).rgb); }
  float weight(vec3 c) { return uFirst > 0.5 ? 1.0 / (1.0 + max(max(c.r, c.g), c.b)) : 1.0; }
  vec3 box(vec3 a, vec3 b, vec3 c, vec3 d) {
    float wa = weight(a), wb = weight(b), wc = weight(c), wd = weight(d);
    return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
  }
  void main() {
    vec3 a = tap(vec2(-2.0, -2.0)), b = tap(vec2(0.0, -2.0)), c = tap(vec2(2.0, -2.0));
    vec3 d = tap(vec2(-1.0, -1.0)), e = tap(vec2(1.0, -1.0));
    vec3 f = tap(vec2(-2.0, 0.0)), g = tap(vec2(0.0, 0.0)), h = tap(vec2(2.0, 0.0));
    vec3 i = tap(vec2(-1.0, 1.0)), j = tap(vec2(1.0, 1.0));
    vec3 k = tap(vec2(-2.0, 2.0)), l = tap(vec2(0.0, 2.0)), m = tap(vec2(2.0, 2.0));
    vec3 col = box(d, e, i, j) * 0.5 + (box(a, b, f, g) + box(b, c, g, h) + box(f, g, k, l) + box(g, h, l, m)) * 0.125;
    if (uFirst > 0.5) {
      // Only light over the threshold blooms, with a soft knee.
      col = min(col, vec3(64.0));
      float bright = max(max(col.r, col.g), col.b);
      float soft = clamp(bright - uThreshold + uKnee, 0.0, 2.0 * uKnee);
      soft = soft * soft / (4.0 * uKnee + 1e-4);
      col *= max(soft, bright - uThreshold) / max(bright, 1e-4);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** A 3x3 tent over the smaller level, added to this level's own glow: each step up keeps the wide halo and adds a tighter one. */
const UP = /* glsl */ `
  uniform sampler2D tSmall;
  uniform sampler2D tLevel;
  uniform vec2 uTexel;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tSmall, vUv + vec2(-1.0, -1.0) * uTexel).rgb + texture2D(tSmall, vUv + vec2(1.0, -1.0) * uTexel).rgb
      + texture2D(tSmall, vUv + vec2(-1.0, 1.0) * uTexel).rgb + texture2D(tSmall, vUv + vec2(1.0, 1.0) * uTexel).rgb;
    s += 2.0 * (texture2D(tSmall, vUv + vec2(0.0, -1.0) * uTexel).rgb + texture2D(tSmall, vUv + vec2(0.0, 1.0) * uTexel).rgb
      + texture2D(tSmall, vUv + vec2(-1.0, 0.0) * uTexel).rgb + texture2D(tSmall, vUv + vec2(1.0, 0.0) * uTexel).rgb);
    s += 4.0 * texture2D(tSmall, vUv).rgb;
    gl_FragColor = vec4(texture2D(tLevel, vUv).rgb + s / 16.0, 1.0);
  }
`;

function target(): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
}

/**
 * The glow round the arena lights, the LED boards and hot highlights:
 * the picture is stepped down five times by half, keeping only what is
 * brighter than white, then stepped back up, each level adding its blur
 * to the next. It all runs at half resolution or less, so it costs well
 * under a millisecond on a laptop card.
 */
export class Bloom {
  private readonly down: THREE.WebGLRenderTarget[] = [];
  private readonly up: THREE.WebGLRenderTarget[] = [];
  private readonly downMat = passMaterial(DOWN, { tInput: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 1 }, uThreshold: { value: 1 }, uKnee: { value: 0.5 } });
  private readonly upMat = passMaterial(UP, { tSmall: { value: null }, tLevel: { value: null }, uTexel: { value: new THREE.Vector2() } });
  private width = 0;
  private height = 0;
  /** Linear light above which things glow. */
  threshold = 1;

  constructor(private readonly quad: FullScreen) {
    for (let i = 0; i < LEVELS; i++) {
      this.down.push(target());
      if (i < LEVELS - 1) this.up.push(target());
    }
  }

  /** The glow, at half the size of the picture. */
  get texture(): THREE.Texture {
    return this.up[0]!.texture;
  }

  setSize(width: number, height: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    for (let i = 0; i < LEVELS; i++) {
      const w = Math.max(1, Math.round(width / 2 ** (i + 1)));
      const h = Math.max(1, Math.round(height / 2 ** (i + 1)));
      this.down[i]!.setSize(w, h);
      this.up[i]?.setSize(w, h);
    }
  }

  render(renderer: THREE.WebGLRenderer, source: THREE.Texture): void {
    const u = this.downMat.uniforms;
    let input = source;
    let w = this.width;
    let h = this.height;
    u.uThreshold!.value = this.threshold;
    for (let i = 0; i < LEVELS; i++) {
      u.tInput!.value = input;
      (u.uTexel!.value as THREE.Vector2).set(1 / w, 1 / h);
      u.uFirst!.value = i === 0 ? 1 : 0;
      this.quad.draw(renderer, this.downMat, this.down[i]!);
      input = this.down[i]!.texture;
      w = this.down[i]!.width;
      h = this.down[i]!.height;
    }
    const v = this.upMat.uniforms;
    for (let i = LEVELS - 2; i >= 0; i--) {
      const small = i === LEVELS - 2 ? this.down[i + 1]! : this.up[i + 1]!;
      v.tSmall!.value = small.texture;
      v.tLevel!.value = this.down[i]!.texture;
      (v.uTexel!.value as THREE.Vector2).set(1 / small.width, 1 / small.height);
      this.quad.draw(renderer, this.upMat, this.up[i]!);
    }
  }

  dispose(): void {
    for (const t of [...this.down, ...this.up]) t.dispose();
    this.downMat.dispose();
    this.upMat.dispose();
  }
}
