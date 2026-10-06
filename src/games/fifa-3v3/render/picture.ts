import * as THREE from "three";
import { AutoQuality, targetFps } from "./auto-quality";
import { OVERLAY_LAYER } from "./layers";
import { BroadcastPost } from "./post/broadcast-post";
import { easeLook, lookFor } from "./post/look";

export interface PictureOptions {
  /**
   * "low" drops shadows, the finish, the crowd and the light beams and
   * draws at a lower resolution, for software graphics in browser tests.
   * "film" is "high" without multisampling, for the showcase: the capture
   * tool renders it in software, and the video encoder softens edges anyway.
   */
  quality?: "high" | "low" | "film";
  /** Draws at this share of the screen's resolution. The showcase's clip uses less, to film in time. */
  scale?: number;
  /** Steps the picture down on a card that cannot hold the frame rate. On by default for "high". */
  auto?: boolean;
}

/**
 * The canvas and how a frame reaches it: the renderer, the broadcast
 * finish (post/), the size, and the frame budget that steps the picture
 * down on a card that cannot keep up. The match renderer hands it a
 * scene and a camera each frame.
 */
export class Picture {
  readonly renderer: THREE.WebGLRenderer;
  readonly low: boolean;
  /** Steps the picture down on a slow card. Live play only: the showcase is filmed on a fake clock. */
  readonly auto: AutoQuality | null;
  private post: BroadcastPost | null;
  private readonly scale: number;
  private readonly film: boolean;
  private size = { width: 1, height: 1, dpr: 1 };
  private gain = 1;

  constructor(canvas: HTMLCanvasElement, options: PictureOptions = {}) {
    const quality = options.quality ?? "high";
    this.low = quality === "low";
    this.film = quality === "film";
    this.auto = quality === "high" && options.auto !== false ? new AutoQuality(targetFps) : null;
    this.scale = options.scale ?? 1;
    // With the finish the scene is drawn into its own multisampled target, so the canvas needs none.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.low, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // The shadow map is drawn once a frame, before the scene, not again for the tags drawn over it.
    this.renderer.shadowMap.autoUpdate = false;
    // A frame is several draws (the scene, the finish's passes, the tags): the counts cover them all.
    this.renderer.info.autoReset = false;
    this.post = this.low ? null : new BroadcastPost({ samples: this.film ? 0 : 4, bloom: true, dof: true });
    // The finish applies the filmic curve itself; the low picture lets three apply it.
    this.renderer.toneMapping = this.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  }

  /** Brightens or darkens the whole picture, for the showcase's film look. */
  setExposure(exposure: number): void {
    this.renderer.toneMappingExposure = exposure;
    this.gain = exposure;
    if (this.post) this.post.gain = exposure;
  }

  /** Whether close ups may use the fine cut of the bodies. */
  get fineBodies(): boolean {
    return this.auto?.fineBodies ?? true;
  }

  resize(width: number, height: number, dpr: number): void {
    this.size = { width, height, dpr };
    const ratio = (this.low ? 0.6 : Math.min(dpr, this.auto?.pixelCap ?? 1.5)) * this.scale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
  }

  /** Records a frame `raw` seconds after the last, stepping the picture down if the card keeps missing the rate. */
  frame(raw: number): void {
    if (!this.auto?.frame(raw)) return;
    this.resize(this.size.width, this.size.height, this.size.dpr);
    if (!this.post) return;
    if (this.post.options.samples !== this.auto.samples) {
      this.post.dispose();
      this.post = new BroadcastPost({ samples: this.auto.samples, bloom: this.auto.bloom, dof: this.auto.depthOfField });
      this.post.gain = this.gain;
    }
    this.post.options.bloom = this.auto.bloom;
    this.post.options.dof = this.auto.depthOfField;
  }

  /** Draws the frame: the scene with its finish for this shot, focused on `subject`, then the tags over it. */
  draw(scene: THREE.Scene, camera: THREE.PerspectiveCamera, shot: string, subject: THREE.Vector3, dt: number): void {
    this.renderer.info.reset();
    this.renderer.shadowMap.needsUpdate = true;
    if (!this.post) {
      camera.layers.enable(OVERLAY_LAYER);
      this.renderer.render(scene, camera);
      return;
    }
    // A cut to the replay grades in over a few frames; a still (dt 0) takes its look at once.
    easeLook(this.post.look, lookFor(shot), dt > 0 ? dt : 1, 5);
    const distance = camera.position.distanceTo(subject);
    this.post.focus.distance = distance;
    this.post.focus.range = Math.max(0.8, distance * 0.18);
    camera.layers.set(0);
    this.post.render(this.renderer, scene, camera);
    camera.layers.set(OVERLAY_LAYER);
    const clear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.render(scene, camera);
    this.renderer.autoClear = clear;
    camera.layers.set(0);
  }

  dispose(): void {
    this.post?.dispose();
    this.renderer.dispose();
  }
}
