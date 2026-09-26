import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/**
 * Caps the light going into the bloom. A glint where polished steel turns
 * toward a hard light can be hundreds of times brighter than white, and
 * some drivers return NaN there; bloom would smear either into a haze.
 */
const CLAMP = {
  uniforms: { tDiffuse: { value: null }, ceiling: { value: 10 } },
  vertexShader: QUAD_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float ceiling;
    varying vec2 vUv;
    void main() {
      vec4 colour = texture2D(tDiffuse, vUv);
      vec3 rgb = colour.rgb;
      if (any(isnan(rgb)) || any(isinf(rgb))) rgb = vec3(0.0);
      float peak = max(max(rgb.r, rgb.g), rgb.b);
      if (peak > ceiling) rgb *= ceiling / peak;
      gl_FragColor = vec4(max(rgb, vec3(0.0)), colour.a);
    }
  `,
};

/** A gentle darkening toward each view's corners, and a colour wash that a final hit can call up. */
const FINISH = {
  uniforms: { tDiffuse: { value: null }, vignette: { value: 0.3 }, wash: { value: new THREE.Color(0, 0, 0) }, washAmount: { value: 0 } },
  vertexShader: QUAD_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform vec3 wash;
    uniform float washAmount;
    varying vec2 vUv;
    void main() {
      vec4 colour = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float fade = 1.0 - vignette * smoothstep(0.2, 0.8, dot(d, d) * 2.4);
      vec3 rgb = colour.rgb * fade;
      // The wash only tints the edges, so the middle of the view, where the blow lands, stays true.
      rgb = mix(rgb, rgb * 0.7 + wash * 0.3, washAmount * smoothstep(0.25, 0.9, dot(d, d) * 2.4));
      gl_FragColor = vec4(rgb, colour.a);
    }
  `,
};

/**
 * The finish on each half of the split screen: bloom, so blades of light,
 * sparks, fire and trails glow past their edges, then tone mapping and a
 * vignette. Both halves are the same size, so one composer serves both:
 * each half is drawn through it in turn, into its own part of the screen.
 */
export class SplitPost {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly pass: RenderPass;
  private readonly finish: ShaderPass;
  private width = 0;
  private height = 0;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, samples: number) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, target);
    this.pass = new RenderPass(scene, new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.35, 1.1);
    this.finish = new ShaderPass(FINISH);
    this.composer.addPass(this.pass);
    this.composer.addPass(new ShaderPass(CLAMP));
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.finish);
  }

  /** The size of one half, in CSS pixels, and the renderer's pixel ratio. */
  setSize(width: number, height: number, pixelRatio: number): void {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    // Bloom is soft anyway, so it runs at half the resolution.
    this.bloom.resolution.set((width * pixelRatio) / 2, (height * pixelRatio) / 2);
  }

  /** Stronger bloom at night, when the fire and the blades should glow. */
  setBloom(strength: number, threshold: number): void {
    this.bloom.strength = strength;
    this.bloom.threshold = threshold;
  }

  /** A wash of colour creeping in from the edges, 0 to 1, for the final hit. */
  setWash(colour: THREE.Color, amount: number): void {
    (this.finish.uniforms.wash!.value as THREE.Color).copy(colour);
    this.finish.uniforms.washAmount!.value = amount;
  }

  /** Draws one half. The renderer's viewport and scissor must already frame it. */
  draw(camera: THREE.Camera): void {
    this.pass.camera = camera;
    this.composer.render();
  }

  dispose(): void {
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose();
  }
}
