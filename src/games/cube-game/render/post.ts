import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/** One viewport of the picture: which camera, which part of the canvas in CSS pixels from the top left, and a hook to set up the scene for it. */
export interface Viewport {
  camera: THREE.Camera;
  x: number;
  y: number;
  width: number;
  height: number;
  prepare(): void;
}

/**
 * Draws every viewport into one picture, so the bloom and tone mapping
 * run once over the whole split screen instead of once per player.
 */
class SplitPass extends Pass {
  views: Viewport[] = [];
  pixelRatio = 1;

  constructor(private readonly scene: THREE.Scene) {
    super();
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(read);
    renderer.clear();
    const fullHeight = read.height / this.pixelRatio;
    for (const view of this.views) {
      view.prepare();
      // Render targets count pixels from the bottom left.
      const y = fullHeight - view.y - view.height;
      const r = this.pixelRatio;
      read.viewport.set(view.x * r, y * r, view.width * r, view.height * r);
      read.scissor.set(view.x * r, y * r, view.width * r, view.height * r);
      read.scissorTest = true;
      renderer.setRenderTarget(read);
      renderer.render(this.scene, view.camera);
    }
    read.viewport.set(0, 0, read.width, read.height);
    read.scissorTest = false;
  }
}

/** The finish: bloom so every neon edge glows past itself, then tone mapping. */
export class Post {
  private readonly composer: EffectComposer;
  private readonly split: SplitPass;
  private readonly bloom: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.composer = new EffectComposer(renderer, target);
    this.split = new SplitPass(scene);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.8);
    this.composer.addPass(this.split);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.split.pixelRatio = pixelRatio;
    // Bloom is soft anyway, so it works at half the resolution.
    this.bloom.resolution.set((width * pixelRatio) / 2, (height * pixelRatio) / 2);
  }

  setBloom(strength: number): void {
    this.bloom.strength = strength;
  }

  draw(views: Viewport[]): void {
    this.split.views = views;
    this.composer.render();
  }

  dispose(): void {
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose();
  }
}
