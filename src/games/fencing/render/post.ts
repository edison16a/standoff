import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** A soft darkening toward the corners, like a broadcast lens, drawn last. */
const VIGNETTE = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.32 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec2 vUv;
    void main() {
      vec4 colour = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float fade = 1.0 - strength * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(colour.rgb * fade, colour.a);
    }
  `,
};

/**
 * The finish on the picture: bloom, so lamps, sparks and blade trails glow
 * past their edges, then the tone mapping, then a gentle vignette. Only
 * the brightest things bloom, so the hall itself stays crisp.
 */
export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly render: RenderPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, samples: number) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, target);
    this.render = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.82);
    this.composer.addPass(this.render);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(VIGNETTE));
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    // Bloom is soft anyway, so it runs at half the resolution.
    this.bloom.resolution.set((width * pixelRatio) / 2, (height * pixelRatio) / 2);
  }

  /** Stronger bloom in the evening, when the lamps and boards should glow. */
  setBloom(strength: number, threshold: number): void {
    this.bloom.strength = strength;
    this.bloom.threshold = threshold;
  }

  draw(camera: THREE.Camera): void {
    this.render.camera = camera;
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.bloom.dispose();
  }
}
