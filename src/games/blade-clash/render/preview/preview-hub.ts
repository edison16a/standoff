import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MINIMAL, readQuality } from "../quality";

/** Something the hub draws each frame into its own 2D canvas. */
export interface PreviewSubject {
  readonly canvas: HTMLCanvasElement;
  /** Moves the subject on, and returns what to draw, or null to skip this frame. */
  frame(now: number): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null;
}

/**
 * One WebGL renderer for every 3D fencer on the phone. Phones allow only a
 * few live WebGL contexts, and the picker alone shows four fencers, so
 * each preview is drawn in turn on one hidden canvas and copied into its
 * own. The hub starts with the first preview and closes with the last.
 */
class PreviewHub {
  private renderer: THREE.WebGLRenderer | null = null;
  private environment: THREE.Texture | null = null;
  private readonly subjects = new Set<PreviewSubject>();
  private frameId = 0;
  /** When the next frame may be drawn, and whether the last ones were too slow for full resolution. */
  private nextAt = 0;
  private slow = false;
  /** Browser tests on software rendering ask for the cheapest picture with `?fq=min`. */
  private readonly minimal = readQuality() === MINIMAL;

  add(subject: PreviewSubject): void {
    this.subjects.add(subject);
    if (!this.renderer) this.open();
  }

  remove(subject: PreviewSubject): void {
    this.subjects.delete(subject);
    if (this.subjects.size === 0) this.close();
  }

  /** The studio reflections every preview scene uses. */
  get env(): THREE.Texture | null {
    return this.environment;
  }

  private open(): void {
    const canvas = document.createElement("canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.frameId = requestAnimationFrame(this.draw);
  }

  private close(): void {
    cancelAnimationFrame(this.frameId);
    this.environment?.dispose();
    this.environment = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
  }

  private readonly draw = (now: number) => {
    const renderer = this.renderer;
    if (!renderer) return;
    this.frameId = requestAnimationFrame(this.draw);
    // A slow phone must never let the previews starve the page: skip frames and drop resolution until it keeps up.
    if (now < this.nextAt) return;
    const started = performance.now();
    const dpr = this.minimal ? 0.5 : Math.min(this.slow ? 1 : 2, window.devicePixelRatio || 1);
    for (const subject of this.subjects) {
      const target = subject.canvas;
      const width = Math.round(target.clientWidth * dpr);
      const height = Math.round(target.clientHeight * dpr);
      if (width < 2 || height < 2) continue;
      const shot = subject.frame(now);
      if (!shot) continue;
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== width || size.y !== height) renderer.setSize(width, height, false);
      shot.scene.environment = this.environment;
      shot.camera.aspect = width / height;
      shot.camera.updateProjectionMatrix();
      renderer.render(shot.scene, shot.camera);
      if (target.width !== width || target.height !== height) {
        target.width = width;
        target.height = height;
      }
      const ctx = target.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(renderer.domElement, 0, 0);
    }
    const took = performance.now() - started;
    this.slow = took > 40;
    this.nextAt = took > 14 ? now + took * 1.5 : 0;
  };
}

export const previewHub = new PreviewHub();
