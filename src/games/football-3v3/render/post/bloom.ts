import * as THREE from "three";
import { FullScreen, hdrTarget, passMaterial } from "./fullscreen";

/** Halvings below the picture: a half, a quarter, down to a thirty second. */
const LEVELS = 5;

/**
 * Thirteen taps in five overlapping boxes, the filmic bloom's weighting.
 * On the first step down every box is averaged by its brightness (a
 * Karis average), so one blazing pixel, a lamp or a glint off a helmet,
 * cannot flicker into a blob as it crosses from pixel to pixel. Only the
 * light above the threshold goes on, through a soft knee.
 */
const DOWN = /* glsl */ `
  uniform sampler2D tInput;
  uniform vec2 uTexel;
  uniform float uFirst;
  uniform float uThreshold;
  varying vec2 vUv;
  vec3 tap(vec2 o) { return texture2D(tInput, vUv + o * uTexel).rgb; }
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
      // A bad pixel must not spread over the screen.
      if (any(isnan(col)) || any(isinf(col))) col = vec3(0.0);
      col = min(col, vec3(60.0));
      float bright = max(max(col.r, col.g), col.b);
      float knee = uThreshold * 0.5;
      float soft = clamp(bright - uThreshold + knee, 0.0, 2.0 * knee);
      soft = soft * soft / (4.0 * knee + 1e-4);
      col *= max(soft, bright - uThreshold) / max(bright, 1e-4);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** A 3x3 tent over the smaller level added to this level's own: each step up keeps the wide halo and adds a tighter one. */
const UP = /* glsl */ `
  uniform sampler2D tSmall;
  uniform sampler2D tLevel;
  uniform vec2 uTexel;
  varying vec2 vUv;
  vec3 tap(vec2 o) { return texture2D(tSmall, vUv + o * uTexel).rgb; }
  void main() {
    vec3 s = tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
    s += 2.0 * (tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0)) + tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)));
    s += 4.0 * tap(vec2(0.0));
    gl_FragColor = vec4(texture2D(tLevel, vUv).rgb + s / 16.0, 1.0);
  }
`;

/**
 * The glow round the floodlights, the ribbon boards and hot highlights.
 * The picture steps down by halves keeping only light brighter than
 * white, then steps back up, each level adding its blur to the next.
 * Everything runs at half resolution or less: well under a millisecond
 * on a laptop card.
 */
export class Bloom {
  private readonly down: THREE.WebGLRenderTarget[] = [];
  private readonly up: THREE.WebGLRenderTarget[] = [];
  private readonly downMat = passMaterial(DOWN, { tInput: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 1 }, uThreshold: { value: 1 } });
  private readonly upMat = passMaterial(UP, { tSmall: { value: null }, tLevel: { value: null }, uTexel: { value: new THREE.Vector2() } });
  private width = 0;
  private height = 0;
  /** Linear light above which things glow. */
  threshold = 1.1;

  constructor(private readonly quad: FullScreen) {
    for (let i = 0; i < LEVELS; i++) {
      this.down.push(hdrTarget());
      if (i < LEVELS - 1) this.up.push(hdrTarget());
    }
  }

  /** The glow at half the picture's size; its levels add up to about five times the light that went in. */
  get texture(): THREE.Texture {
    return this.up[0]!.texture;
  }

  static readonly LEVELS = LEVELS;

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
