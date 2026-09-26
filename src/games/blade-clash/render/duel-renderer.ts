import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { START_X } from "@/games/blade-clash/engine/rules";
import { otherSlot, SLOTS, type Slot } from "@/games/blade-clash/players";
import { Arena } from "./arena/arena";
import { arenaTheme } from "./arena/arena-theme";
import { arenaEnvironment } from "./arena/environment";
import { Effects, type Blades } from "./effects/effects";
import { FighterView } from "./fighter/fighter-view";
import { PLAYER_COLOURS } from "./player-colours";
import { SplitPost } from "./post";
import { readQuality, type Quality } from "./quality";
import { ShoulderCamera } from "./shoulder-camera";
import { VIEWS, type ViewRect } from "./split";

/** A part of the screen and the camera drawn into it. */
export interface View {
  rect: ViewRect;
  camera: THREE.PerspectiveCamera;
}

/**
 * Draws the duel as a split screen: one WebGL canvas, the same arena
 * drawn twice through scissored viewports, each half with its own camera
 * over its own fighter's shoulder. It never decides anything; it shows
 * what the engine says and reacts to the same events as the sound.
 */
export class DuelRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly fighters: Record<Slot, FighterView> = { 1: new FighterView(1), 2: new FighterView(2) };
  readonly cameras: Record<Slot, ShoulderCamera> = { 1: new ShoulderCamera(), 2: new ShoulderCamera() };
  private readonly effects = new Effects();
  private readonly quality: Quality;
  private readonly blades: Blades;
  private readonly post: SplitPost | null;
  private environment: THREE.Texture | null = null;
  private arena: Arena | null = null;
  private dark: boolean | null = null;
  private lastWall: number | null = null;
  private lastGame = 0;
  private width = 1;
  private height = 1;
  /** The final hit's colour wash, and whose colour it is. */
  private wash = { target: 0, amount: 0, colour: new THREE.Color() };

  constructor(canvas: HTMLCanvasElement, options: { quality?: Quality; preserve?: boolean } = {}) {
    this.quality = options.quality ?? readQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality.antialias && !this.quality.post, powerPreference: "high-performance", preserveDrawingBuffer: Boolean(options.preserve) });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Both halves see the same shadows, so the maps are drawn once a frame, not once a view.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setScissorTest(true);
    this.post = this.quality.post ? new SplitPost(this.renderer, this.scene, this.quality.antialias ? 4 : 0) : null;
    this.scene.add(this.fighters[1].group, this.fighters[2].group, this.fighters[1].light, this.fighters[2].light, this.effects.group);
    this.blades = {
      tip: { 1: this.fighters[1].tip, 2: this.fighters[2].tip },
      mid: { 1: this.fighters[1].mid, 2: this.fighters[2].mid },
      chest: { 1: this.fighters[1].chest, 2: this.fighters[2].chest },
      style: { 1: null, 2: null },
    };
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.renderer.setPixelRatio(Math.min(dpr, this.quality.maxPixelRatio));
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Day or night arena. Rebuilding it is quick, and only happens when the theme flips. */
  setTheme(dark: boolean): void {
    if (dark === this.dark) return;
    this.dark = dark;
    const theme = arenaTheme(dark);
    if (this.arena) {
      this.scene.remove(this.arena.group);
      this.arena.dispose();
    }
    this.arena = new Arena(theme, this.quality);
    this.scene.add(this.arena.group);
    this.scene.background = new THREE.Color(theme.horizon);
    this.scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);
    this.environment?.dispose();
    this.environment = arenaEnvironment(this.renderer, theme);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = theme.reflections;
    this.renderer.toneMappingExposure = theme.exposure;
    // Only light past white blooms: blades of light, sparks, fire and trails, never lit armour or stone.
    this.post?.setBloom(dark ? 0.6 : 0.45, dark ? 1.1 : 1.3);
  }

  /** A game event, as it happens. */
  react(event: GameEvent, wallNow = performance.now()): void {
    const floor = this.arena?.floor ?? 0;
    this.effects.react(event, this.blades, this.lastGame, wallNow, floor);
    this.arena?.react(event, wallNow);
    for (const slot of SLOTS) this.fighters[slot].react(event);
    if (event.type === "hit") {
      this.cameras[event.victim].shake(event.final ? 0.09 : 0.05, wallNow);
      this.cameras[event.attacker].shake(0.02, wallNow);
      if (event.final) {
        const at = new THREE.Vector3(event.at.x, event.at.y + floor, event.at.z);
        for (const slot of SLOTS) this.cameras[slot].closeIn(at);
        this.wash.colour.set(PLAYER_COLOURS[event.attacker]);
        this.wash.target = 0.8;
      }
    }
    if (event.type === "clash") for (const slot of SLOTS) this.cameras[slot].shake(0.02 + 0.04 * event.strength, wallNow);
    if (event.type === "finish") {
      for (const slot of SLOTS) this.cameras[slot].closeIn(null);
      this.wash.target = 0;
    }
    if (event.type === "matchWon") this.cameras[event.winner].setCelebrating(true);
    if (event.type === "countdown" && event.remaining === 3) this.reset();
  }

  /** A new match or bout: clear the last one's effects and put the cameras back. */
  reset(): void {
    this.effects.reset();
    for (const slot of SLOTS) this.cameras[slot].snap();
    this.wash.target = this.wash.amount = 0;
  }

  /** Moves everything on to `frame` and draws it: by default each player's shoulder view in their half, or the `views` given. */
  render(frame: StageFrame, wallNow: number, views?: readonly View[]): void {
    this.update(frame, wallNow);
    this.draw(views);
  }

  /** Moves everything on to `frame` without drawing: the fighters, the effects, the arena and the cameras. */
  update(frame: StageFrame, wallNow: number): void {
    if (this.dark === null) this.setTheme(false);
    const arena = this.arena!;
    const dt = this.lastWall === null ? 16 : Math.min(100, Math.max(0, wallNow - this.lastWall));
    this.lastWall = wallNow;
    this.lastGame = frame.t;

    const bySlot = { 1: frame.fighters.find((f) => f.slot === 1), 2: frame.fighters.find((f) => f.slot === 2) };
    for (const slot of SLOTS) {
      this.fighters[slot].update(bySlot[slot], arena.floor, frame.t);
      this.blades.style[slot] = this.fighters[slot].trail;
    }
    this.effects.track(this.blades, { 1: this.fighters[1].visible, 2: this.fighters[2].visible }, frame.t);
    arena.update(wallNow, dt);
    for (const slot of SLOTS) {
      const me = bySlot[slot] ?? { x: slot === 1 ? -START_X : START_X, facing: slot === 1 ? (1 as const) : (-1 as const) };
      const themX = bySlot[otherSlot(slot)]?.x ?? (slot === 1 ? START_X : -START_X);
      this.cameras[slot].update(me, themX, arena.floor, dt, wallNow);
    }
    this.wash.amount += (this.wash.target - this.wash.amount) * (1 - Math.exp(-dt / 250));
    this.post?.setWash(this.wash.colour, this.wash.amount);
    this.effects.update(frame.t, wallNow);
  }

  /** Draws the state `update` left, into each view. */
  draw(views?: readonly View[]): void {
    this.renderer.shadowMap.needsUpdate = true;
    for (const view of views ?? SLOTS.map((slot) => ({ rect: VIEWS[slot], camera: this.cameras[slot].camera }))) {
      this.effects.face(view.camera);
      this.drawView(view);
    }
  }

  private drawView({ rect, camera }: View): void {
    const x = Math.round(rect.x * this.width);
    const w = Math.round(rect.w * this.width);
    const h = Math.round(rect.h * this.height);
    const y = Math.round((1 - rect.y - rect.h) * this.height);
    this.renderer.setViewport(x, y, w, h);
    this.renderer.setScissor(x, y, w, h);
    const aspect = w / Math.max(1, h);
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    if (this.post) {
      this.post.setSize(w, h, this.renderer.getPixelRatio());
      this.post.draw(camera);
    } else {
      this.renderer.render(this.scene, camera);
    }
  }

  dispose(): void {
    this.fighters[1].dispose();
    this.fighters[2].dispose();
    this.effects.dispose();
    this.arena?.dispose();
    this.environment?.dispose();
    this.post?.dispose();
    // No forceContextLoss here: React mounts the stage twice on the same canvas in development, and a lost context cannot be had back.
    this.renderer.dispose();
  }
}
