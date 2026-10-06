import * as THREE from "three";
import { BroadcastPost } from "./post/broadcast-post";
import { easeLook, type Look } from "./post/look";
import type { Quality } from "./quality";
import { PixelBudget } from "./resolution-governor";

/**
 * The canvas and how a frame reaches it. With a graphics card the scene
 * goes through the broadcast finish (`post/`): multisampled HDR, bloom,
 * the filmic curve and the grade. A computer drawing in software gets the
 * plain path: straight to the screen, tone mapped by three.js. Either way
 * the frame budget sets the resolution.
 */
export class Picture {
  readonly renderer: THREE.WebGLRenderer;
  readonly post: BroadcastPost | null;
  private readonly budget: PixelBudget;
  /** The showcase's film look brightens the whole picture by this. */
  private exposureScale = 1;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    const { antialias = true, shadows = true, maxPixelRatio = 1.75, post = true } = quality;
    // With the finish on, the multisampling happens in its own target, so the canvas itself needs none.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: antialias && !post, powerPreference: "high-performance", stencil: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Shadows are drawn once a frame, before the floor's reflection, and reused by the main view.
    this.renderer.shadowMap.autoUpdate = false;
    const samples = antialias ? Math.min(4, this.renderer.capabilities.maxSamples) : 0;
    this.post = post ? new BroadcastPost(samples) : null;
    this.budget = new PixelBudget(this.renderer, maxPixelRatio);
  }

  resize(width: number, height: number, dpr: number): void {
    this.budget.resize(width, height, dpr);
  }

  /** The device pixels drawn per CSS pixel right now. */
  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  setExposureScale(scale: number): void {
    this.exposureScale = scale;
    this.renderer.toneMappingExposure = 1.05 * scale;
  }

  /** Eases the grade toward `look` (live play, the replay or the ceremony). */
  grade(look: Readonly<Look>, dt: number, cut: boolean): void {
    if (!this.post) return;
    easeLook(this.post.look, look, cut ? 1e3 : dt, 4);
  }

  /** Where the depth of field focuses, when the look has it on. */
  focus(distance: number, range: number): void {
    if (!this.post) return;
    this.post.focus.distance = distance;
    this.post.focus.range = range;
  }

  /**
   * Draws a frame: the shadows, then `before` (the floor's reflection,
   * which needs the shadows), then the scene through the finish.
   */
  draw(scene: THREE.Scene, camera: THREE.PerspectiveCamera, before?: () => void): void {
    this.budget.draw(() => {
      this.renderer.shadowMap.needsUpdate = true;
      before?.();
      if (!this.post) {
        this.renderer.setRenderTarget(null);
        this.renderer.render(scene, camera);
        return;
      }
      const look = this.post.look;
      const base = look.exposure;
      look.exposure = base * this.exposureScale;
      this.post.render(this.renderer, scene, camera);
      look.exposure = base;
    });
  }

  /** Waits for the card to finish its frames (see CourtRenderer.finish). */
  finish(pixel: Uint8Array): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  }

  dispose(): void {
    this.post?.dispose();
    this.budget.dispose();
    this.renderer.dispose();
  }
}
