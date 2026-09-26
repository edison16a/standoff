import * as THREE from "three";
import { neonEnvironment } from "./world/neon-env";
import type { RunScene } from "./run-scene";
import type { ViewRect } from "./split";
import { setTextureDetail } from "./textures";

export { splitScreen, type ViewRect } from "./split";

export interface View {
  scene: RunScene;
  rect: ViewRect;
  /** A camera of its own, for the showcase. Otherwise the scene's chase camera. */
  camera?: THREE.PerspectiveCamera;
}

/** Whether this WebGL is drawn in software, as when the browser has blocked the graphics driver. */
function softwareDrawn(renderer: THREE.WebGLRenderer): boolean {
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}

/**
 * One WebGL canvas that draws each runner's scene into its own part of
 * the screen. The neon street every scene reflects is made once here.
 */
export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly environment: THREE.Texture;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, options: { preserve?: boolean; antialias?: boolean } = {}) {
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: options.antialias ?? true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.preserve ?? false,
    });
    setTextureDetail(softwareDrawn(this.gl) ? 1 : Math.min(4, this.gl.capabilities.getMaxAnisotropy()));
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.15;
    this.gl.setScissorTest(true);
    this.environment = neonEnvironment(this.gl);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    // Two full views at retina density is too much for a laptop, so the density is capped.
    this.gl.setPixelRatio(Math.min(dpr, 1.5));
    this.gl.setSize(this.width, this.height, false);
  }

  render(views: readonly View[]): void {
    for (const view of views) {
      const x = Math.round(view.rect.x * this.width);
      const w = Math.round(view.rect.w * this.width);
      const h = Math.round(view.rect.h * this.height);
      const y = Math.round((1 - view.rect.y - view.rect.h) * this.height);
      const camera = view.camera ?? view.scene.chase.camera;
      if (!view.camera) view.scene.chase.setAspect(w / h);
      view.scene.effects.setViewHeight(h * this.gl.getPixelRatio());
      this.gl.setViewport(x, y, w, h);
      this.gl.setScissor(x, y, w, h);
      this.gl.render(view.scene.scene, camera);
    }
  }

  dispose(): void {
    this.environment.dispose();
    this.gl.dispose();
  }
}
