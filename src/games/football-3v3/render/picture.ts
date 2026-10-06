import * as THREE from "three";
import { Finish } from "./post/finish";
import { easeLook, type Look } from "./post/look";
import { Governor } from "./quality/governor";
import type { Tier } from "./quality/ladder";

/** "high" for a real graphics card, "film" for the showcase capture, "low" for software drawing in browser tests. */
export type Quality = "high" | "low" | "film";

/**
 * The canvas and how a frame reaches it. On a graphics card the scene
 * goes through the broadcast finish (`post/`): multisampled HDR, bloom,
 * the filmic curve and the grade, with the automatic quality ladder
 * keeping it inside 60 frames a second. Software drawing gets the plain
 * path: straight to the screen, tone mapped by three. Name tags are
 * drawn last, over the graded picture, so they stay crisp and true.
 */
export class Picture {
  readonly renderer: THREE.WebGLRenderer;
  readonly finish: Finish | null;
  readonly governor: Governor;
  /** Brightens the whole picture, for the showcase's film lights. */
  exposureScale = 1;

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    const post = quality !== "low";
    // With the finish on, the multisampling happens in its own target, so the canvas needs none.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = post;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // A frame is many passes; its counts are kept from the first to the last.
    this.renderer.info.autoReset = false;
    this.governor = new Governor(this.renderer, quality !== "high");
    this.finish = post ? new Finish(this.samples(this.governor.tier)) : null;
    this.governor.onTier((tier) => this.finish?.setSamples(this.samples(tier)));
  }

  private samples(tier: Tier): number {
    return Math.min(tier.samples, this.renderer.capabilities.maxSamples);
  }

  get tier(): Tier {
    return this.governor.tier;
  }

  resize(width: number, height: number, ratio: number): void {
    this.governor.resize(width, height, ratio);
  }

  /** Eases the grade toward `look`; a cut changes it at once. */
  grade(look: Readonly<Look>, dt: number, cut: boolean): void {
    if (this.finish) easeLook(this.finish.look, look, cut ? 1e3 : dt, 3.5);
  }

  /** Where the depth of field focuses when the look has it on, in metres from the lens. */
  focus(distance: number, range: number): void {
    if (!this.finish) return;
    this.finish.focus.distance = distance;
    this.finish.focus.range = range;
  }

  draw(scene: THREE.Scene, camera: THREE.PerspectiveCamera, overlay: THREE.Scene | null): void {
    const r = this.renderer;
    r.info.reset();
    this.governor.draw(() => {
      if (this.finish) {
        const bloom = this.finish.look.bloom;
        if (!this.governor.tier.bloom) this.finish.look.bloom = 0;
        this.finish.render(r, scene, camera, this.exposureScale);
        this.finish.look.bloom = bloom;
      } else {
        r.toneMappingExposure = this.exposureScale;
        r.setRenderTarget(null);
        r.render(scene, camera);
      }
      if (!overlay) return;
      r.autoClear = false;
      r.setRenderTarget(null);
      r.clearDepth();
      r.render(overlay, camera);
      r.autoClear = true;
    });
  }

  dispose(): void {
    this.finish?.dispose();
    this.governor.dispose();
    this.renderer.dispose();
  }
}
