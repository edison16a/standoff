import * as THREE from "three";
import type { FightScene } from "./fight-scene";

/** A part of the screen, as shares of its width and height from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface View {
  rect: ViewRect;
  camera: THREE.PerspectiveCamera;
}

export const FULL: ViewRect = { x: 0, y: 0, w: 1, h: 1 };
export const LEFT: ViewRect = { x: 0, y: 0, w: 0.5, h: 1 };
export const RIGHT: ViewRect = { x: 0.5, y: 0, w: 0.5, h: 1 };

/**
 * One WebGL canvas for the whole fight. Split screen is two scissored
 * viewports of the same scene, each with its own camera, so the second
 * player costs one more draw of shared geometry and nothing else.
 */
export class FightRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, options: { preserve?: boolean } = {}) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!options.preserve });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setScissorTest(true);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    // Retina density is too much for two views on a laptop, so it is capped.
    this.renderer.setPixelRatio(Math.min(dpr, 1.5));
    this.renderer.setSize(this.width, this.height, false);
  }

  /** The shape of a view in pixels, for its camera's aspect. */
  aspect(rect: ViewRect): number {
    return (rect.w * this.width) / Math.max(1, rect.h * this.height);
  }

  render(scene: FightScene, views: readonly View[]): void {
    const px = this.renderer.getPixelRatio();
    for (const view of views) {
      const x = Math.round(view.rect.x * this.width);
      const w = Math.round(view.rect.w * this.width);
      const h = Math.round(view.rect.h * this.height);
      const y = Math.round((1 - view.rect.y - view.rect.h) * this.height);
      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);
      const aspect = w / Math.max(1, h);
      if (view.camera.aspect !== aspect) {
        view.camera.aspect = aspect;
        view.camera.updateProjectionMatrix();
      }
      // Particle sizes follow the view's height in real pixels and its field of view.
      scene.setViewHeight((h * px) / (2 * Math.tan(THREE.MathUtils.degToRad(view.camera.fov) / 2)));
      this.renderer.render(scene.scene, view.camera);
    }
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
