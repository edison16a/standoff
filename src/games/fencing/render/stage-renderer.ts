import * as THREE from "three";
import type { GameEvent } from "@/games/fencing/engine/events";
import type { StageFrame } from "@/games/fencing/engine/frames";
import type { Slot } from "@/games/fencing/players";
import { CameraDirector, type FixedShot } from "./camera-director";
import { Effects, type Blades } from "./effects/effects";
import { FencerView } from "./fencer/fencer-view";
import { Hall } from "./hall/hall";
import { hallEnvironment } from "./kit/environments";
import { PostFx } from "./post";
import { hallTheme } from "./hall/hall-theme";
import { readQuality, type Quality } from "./quality";

/** How long the close up holds after the burst, before the camera pulls back. */
const HOLD_AFTER_IMPACT_MS = 850;
/** A touch's close up lasts at least this long, in case the burst never comes. */
const CLOSE_UP_MS = 2400;

export interface RenderExtras {
  /** Scores for the machine's screen. */
  scores?: [number, number];
}

/**
 * Draws the bout in 3D: the hall, both fencers, the effects and a
 * broadcast camera, all from engine frames. It never decides anything; it
 * shows what the engine says and reacts to the same events as the sound.
 */
export class StageRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly director = new CameraDirector();
  private readonly fencers: Record<Slot, FencerView> = { 1: new FencerView(1), 2: new FencerView(2) };
  private readonly effects: Effects;
  private environment: THREE.Texture | null = null;
  private readonly quality: Quality;
  private readonly post: PostFx | null;
  private hall: Hall | null = null;
  private dark: boolean | null = null;
  private lastWall: number | null = null;
  private lastGame = 0;
  private readonly blades: Blades;

  constructor(canvas: HTMLCanvasElement, options: { quality?: Quality; seed?: number } = {}) {
    this.quality = options.quality ?? readQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality.antialias, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Browser tests read draw calls and triangles with `?fdebug`, to keep software rendering affordable.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fdebug")) window.__fencingRender = { info: this.renderer.info, scene: this.scene };
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.post = this.quality.post ? new PostFx(this.renderer, this.scene, this.director.camera, this.quality.antialias ? 4 : 0) : null;
    this.effects = new Effects(options.seed);
    this.scene.add(this.fencers[1].group, this.fencers[2].group, this.effects.group);
    this.blades = {
      tip: { 1: this.fencers[1].tip, 2: this.fencers[2].tip },
      mid: { 1: this.fencers[1].mid, 2: this.fencers[2].mid },
      chest: { 1: new THREE.Vector3(), 2: new THREE.Vector3() },
    };
  }

  resize(width: number, height: number, dpr: number): void {
    const ratio = Math.min(dpr, this.quality.maxPixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.post?.setSize(Math.max(1, width), Math.max(1, height), ratio);
    this.director.setAspect(Math.max(1, width) / Math.max(1, height));
  }

  /** Light or dark hall. Rebuilding it is quick, and only happens when the theme flips. */
  setTheme(dark: boolean): void {
    if (dark === this.dark) return;
    this.dark = dark;
    const theme = hallTheme(dark);
    if (this.hall) {
      this.scene.remove(this.hall.group);
      this.hall.dispose();
    }
    this.hall = new Hall(theme, this.quality);
    this.scene.add(this.hall.group);
    this.scene.background = new THREE.Color(theme.background);
    this.scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);
    this.environment?.dispose();
    this.environment = hallEnvironment(this.renderer, dark);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = theme.reflections;
    this.renderer.toneMappingExposure = theme.exposure;
    // Lit white cloth under the key spot reaches about twice white, so only lamps, boards and effects clear these.
    this.post?.setBloom(dark ? 0.65 : 0.4, dark ? 3 : 3.4);
    for (const slot of [1, 2] as const) this.fencers[slot].group.position.y = this.hall.floor;
  }

  /** A game event, as it happens. Touches cut to a close up; the burst lets it go. */
  react(event: GameEvent, wallNow = performance.now()): void {
    const at = this.effects.react(event, this.blades, this.lastGame, wallNow);
    this.hall?.react(event, wallNow, at);
    if (event.type === "touch" && at) this.director.closeUp(at, event.scorer === 1 ? -1 : 1, wallNow, wallNow + CLOSE_UP_MS);
    if (event.type === "impact") this.director.holdUntil(wallNow + HOLD_AFTER_IMPACT_MS);
    if (event.type === "matchWon") {
      const winner = this.fencers[event.winner].group;
      this.director.winner(winner.position.x, event.winner === 1 ? 1 : -1, wallNow);
    }
    if (event.type === "countdown" || event.type === "allez") this.director.release();
  }

  /** A new match started: clear the last one's effects and camera. */
  reset(): void {
    this.effects.reset();
    this.director.release();
  }

  /** Key art is a frozen moment, where trails and rings read as smears rather than motion. */
  freeze(): void {
    this.effects.freeze();
  }

  /** Pins the camera for key art, or with null lets the director run it again. */
  pin(shot: FixedShot | null): void {
    this.director.pin(shot);
  }

  render(frame: StageFrame, wallNow: number, extras: RenderExtras = {}): void {
    this.update(frame, wallNow, extras);
    this.draw();
  }

  draw(): void {
    if (this.post) this.post.draw(this.director.camera);
    else this.renderer.render(this.scene, this.director.camera);
  }

  /** Moves everything on to this frame without drawing it, so key art can be played up to its moment cheaply. */
  update(frame: StageFrame, wallNow: number, extras: RenderExtras = {}): void {
    if (this.dark === null) this.setTheme(false);
    const hall = this.hall!;
    const dt = this.lastWall === null ? 16 : Math.min(100, Math.max(0, wallNow - this.lastWall));
    this.lastWall = wallNow;
    this.lastGame = frame.t;

    const bySlot = { 1: frame.fencers.find((f) => f.slot === 1), 2: frame.fencers.find((f) => f.slot === 2) };
    const gap = bySlot[1] && bySlot[2] ? Math.abs(bySlot[2].x - bySlot[1].x) : undefined;
    for (const slot of [1, 2] as const) {
      this.fencers[slot].update(bySlot[slot], frame.t, gap);
      const f = bySlot[slot];
      if (f) this.blades.chest[slot].set(f.x + f.facing * 0.12, hall.floor + 1.3, 0);
    }
    this.effects.track(this.blades, { 1: this.fencers[1].visible, 2: this.fencers[2].visible }, frame.t);
    if (extras.scores) hall.setScores(extras.scores[0], extras.scores[1]);

    const xs = frame.fencers.map((f) => f.x);
    this.director.follow(xs.length > 0);
    this.director.update(xs, wallNow, dt);
    const focus = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
    hall.update(wallNow, dt, focus);
    this.effects.update(frame.t, wallNow, this.director.camera);
  }

  dispose(): void {
    this.fencers[1].dispose();
    this.fencers[2].dispose();
    this.effects.dispose();
    this.hall?.dispose();
    this.environment?.dispose();
    this.post?.dispose();
    this.renderer.dispose();
    // The shared materials and textures outlive this renderer and still point at its context. Losing it now frees the GPU at once.
    this.renderer.forceContextLoss();
  }
}

declare global {
  interface Window {
    __fencingRender?: { info: THREE.WebGLInfo; scene: THREE.Scene };
  }
}
