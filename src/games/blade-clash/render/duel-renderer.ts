import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { START_X } from "@/games/blade-clash/engine/rules";
import { otherSlot, SLOTS, type Slot } from "@/games/blade-clash/players";
import { Effects, type Blades } from "./effects/effects";
import { FighterView } from "./fighter/fighter-view";
import { Hall } from "./hall/hall";
import { hallTheme } from "./hall/hall-theme";
import { hallEnvironment } from "./kit/environments";
import { readQuality, type Quality } from "./quality";
import { ShoulderCamera } from "./shoulder-camera";
import { VIEWS } from "./split";

/**
 * Draws the duel as a split screen: one WebGL canvas, the same hall drawn
 * twice through scissored viewports, each half with its own camera over
 * its own fighter's shoulder. It never decides anything; it shows what the
 * engine says and reacts to the same events as the sound.
 */
export class DuelRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly fighters: Record<Slot, FighterView> = { 1: new FighterView(1), 2: new FighterView(2) };
  private readonly cameras: Record<Slot, ShoulderCamera> = { 1: new ShoulderCamera(), 2: new ShoulderCamera() };
  private readonly effects = new Effects();
  private readonly quality: Quality;
  private readonly blades: Blades;
  private environment: THREE.Texture | null = null;
  private hall: Hall | null = null;
  private dark: boolean | null = null;
  private lastWall: number | null = null;
  private lastGame = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, options: { quality?: Quality } = {}) {
    this.quality = options.quality ?? readQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality.antialias, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setScissorTest(true);
    this.scene.add(this.fighters[1].group, this.fighters[2].group, this.effects.group);
    this.blades = {
      tip: { 1: this.fighters[1].tip, 2: this.fighters[2].tip },
      mid: { 1: this.fighters[1].mid, 2: this.fighters[2].mid },
      chest: { 1: this.fighters[1].chest, 2: this.fighters[2].chest },
    };
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.renderer.setPixelRatio(Math.min(dpr, this.quality.maxPixelRatio));
    this.renderer.setSize(this.width, this.height, false);
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
  }

  /** A game event, as it happens. */
  react(event: GameEvent, wallNow = performance.now()): void {
    const floor = this.hall?.floor ?? 0;
    this.effects.react(event, this.blades, this.lastGame, wallNow, floor);
    this.hall?.react(event, wallNow);
    if (event.type === "hit") {
      this.cameras[event.victim].shake(event.final ? 0.09 : 0.05, wallNow);
      this.cameras[event.attacker].shake(0.02, wallNow);
    }
    if (event.type === "clash") for (const slot of SLOTS) this.cameras[slot].shake(0.02 + 0.03 * event.strength, wallNow);
    if (event.type === "countdown" && event.remaining === 3) for (const slot of SLOTS) this.cameras[slot].snap();
  }

  /** A new match started: clear the last one's effects. */
  reset(): void {
    this.effects.reset();
    for (const slot of SLOTS) this.cameras[slot].snap();
  }

  render(frame: StageFrame, wallNow: number): void {
    if (this.dark === null) this.setTheme(false);
    const hall = this.hall!;
    const dt = this.lastWall === null ? 16 : Math.min(100, Math.max(0, wallNow - this.lastWall));
    this.lastWall = wallNow;
    this.lastGame = frame.t;

    const bySlot = { 1: frame.fighters.find((f) => f.slot === 1), 2: frame.fighters.find((f) => f.slot === 2) };
    for (const slot of SLOTS) this.fighters[slot].update(bySlot[slot], hall.floor);
    this.effects.track(this.blades, { 1: this.fighters[1].visible, 2: this.fighters[2].visible }, frame.t);
    const xs = frame.fighters.map((f) => f.x);
    hall.update(wallNow, dt, xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0);

    for (const slot of SLOTS) {
      const me = bySlot[slot] ?? { x: slot === 1 ? -START_X : START_X, facing: slot === 1 ? (1 as const) : (-1 as const) };
      const themX = bySlot[otherSlot(slot)]?.x ?? (slot === 1 ? START_X : -START_X);
      this.cameras[slot].update(me, themX, hall.floor, dt, wallNow);
    }
    for (const slot of SLOTS) {
      this.effects.update(frame.t, wallNow, this.cameras[slot].camera);
      this.draw(slot);
    }
  }

  private draw(slot: Slot): void {
    const rect = VIEWS[slot];
    const x = Math.round(rect.x * this.width);
    const w = Math.round(rect.w * this.width);
    const h = Math.round(rect.h * this.height);
    const y = Math.round((1 - rect.y - rect.h) * this.height);
    this.renderer.setViewport(x, y, w, h);
    this.renderer.setScissor(x, y, w, h);
    const camera = this.cameras[slot].camera;
    const aspect = w / Math.max(1, h);
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, camera);
  }

  dispose(): void {
    this.fighters[1].dispose();
    this.fighters[2].dispose();
    this.effects.dispose();
    this.hall?.dispose();
    this.environment?.dispose();
    // No forceContextLoss here: React mounts the stage twice on the same canvas in development, and a lost context cannot be had back.
    this.renderer.dispose();
  }
}
