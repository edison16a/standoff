import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import { Arena } from "./arena/arena";
import type { CameraPose } from "./camera/aim-ray";
import { ShoulderCamera } from "./camera/shoulder-camera";
import { ShowCamera } from "./camera/show-camera";
import { Effects } from "./effects/effects";
import type { Label } from "./fighter-view";
import { PaneHud } from "./hud/pane-hud";
import { viewport, type Pane } from "./layout";
import { LIGHT } from "./palette";
import { crosshair, showTags } from "./pane-view";
import { FighterViews } from "./views";

/** Half the width of the line between split views, CSS pixels. */
const DIVIDE = 1.5;

/** Rendering features that can be turned down for weak graphics hardware. */
export interface Quality {
  antialias?: boolean;
  shadows?: boolean;
  /** The most device pixels drawn per CSS pixel. */
  maxPixelRatio?: number;
}

/**
 * Draws a battle into up to four views on one canvas: each human player
 * gets their own over the shoulder camera and HUD, and a spare quarter
 * shows the television camera. One scene, one renderer; each view is a
 * scissored viewport, so extra players cost extra draws and nothing more.
 */
export class BattleRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private arena: Arena | null = null;
  private effects: Effects | null = null;
  private fighters: FighterViews | null = null;
  private battle: Battle | null = null;
  private readonly cams = new Map<number, ShoulderCamera>();
  private readonly huds = new Map<number, PaneHud>();
  private labels = new Map<number, Label>();
  readonly show = new ShowCamera();
  private readonly environment: THREE.Texture;
  private width = 1;
  private height = 1;
  private readonly maxPixelRatio: number;

  constructor(canvas: HTMLCanvasElement, quality: Quality = {}) {
    const { antialias = true, shadows = true, maxPixelRatio = 1.5 } = quality;
    this.maxPixelRatio = maxPixelRatio;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // Shadows are drawn once a frame, not once per view.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setScissorTest(true);
    this.renderer.setClearColor("#0b0d18");
    this.renderer.autoClear = false;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.35;
    this.scene.fog = new THREE.Fog(LIGHT.fog, 80, 460);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(dpr, this.maxPixelRatio));
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Shows a battle, building the arena the first time and the fighters for each new battle. */
  setBattle(battle: Battle, label: (id: number) => Label): void {
    if (battle === this.battle) return;
    if (!this.arena) {
      this.arena = new Arena(battle.pieces);
      this.effects = new Effects(battle.pieces);
      this.scene.add(this.arena.group, this.effects.group);
    }
    this.fighters?.dispose();
    this.effects?.clear();
    this.fighters = new FighterViews(battle, label, this.scene);
    this.labels = new Map(battle.fighters.map((f) => [f.id, label(f.id)]));
    for (const hud of this.huds.values()) hud.dispose();
    this.huds.clear();
    this.cams.clear();
    this.show.snap();
    this.battle = battle;
  }

  /** The battle's events for the step just run: effects, flinches, hit markers and cheers. */
  onEvents(events: readonly BattleEvent[]): void {
    const b = this.battle;
    if (!b || !this.fighters) return;
    for (const e of events) {
      this.fighters.onEvent(e);
      this.effects?.onEvent(e, b.fighters, this.fighters.views, b.time);
      if (e.type === "hit") {
        this.huds.get(e.target)?.hurt(e.damage, b.time);
        this.cams.get(e.target)?.bump(0.5 + e.damage / 80);
        this.huds.get(e.shooter)?.mark(e.health <= 0 ? "kill" : e.head ? "head" : "hit", b.time);
      } else if (e.type === "shot" && (e.gun === "shotgun" || e.gun === "sniper")) {
        this.cams.get(e.shooter)?.bump(0.35);
      } else if (e.type === "kill") {
        this.arena?.stands.cheer(0.6);
      } else if (e.type === "round-end" || e.type === "match-end") {
        this.arena?.stands.cheer(1);
      }
    }
  }

  /** The camera behind a fighter as last drawn, for turning a player's aim into a point in the world. */
  cameraPose(fighter: number): CameraPose | null {
    return this.cams.get(fighter)?.pose ?? null;
  }

  /**
   * Moves every animation and camera on without drawing. Rendering does
   * this first; a run up to a still calls it alone for every frame it skips.
   */
  animate(dt: number, wallTime: number, panes: readonly Pane[] = []): void {
    const b = this.battle;
    const fighters = this.fighters;
    if (!b || !fighters || !this.arena || !this.effects) return;
    if (fighters.newRound()) {
      this.effects.clear();
      for (const cam of this.cams.values()) cam.snap();
    }
    fighters.update(dt);
    this.effects.update(b.time, dt);
    this.arena.update(wallTime, dt);
    this.show.update(b.fighters, wallTime, dt);
    for (const pane of panes) {
      const f = pane.fighter !== null ? b.fighters[pane.fighter] : undefined;
      if (!f) continue;
      let cam = this.cams.get(f.id);
      if (!cam) this.cams.set(f.id, (cam = new ShoulderCamera()));
      const view = viewport(pane.rect, this.width, this.height, DIVIDE);
      cam.setAspect(view.w / view.h);
      cam.update(f, b.pieces, dt, b.time);
    }
  }

  render(panes: readonly Pane[], dt: number, wallTime: number): void {
    const b = this.battle;
    const fighters = this.fighters;
    if (!b || !fighters || !this.arena || !this.effects) return;
    this.animate(dt, wallTime, panes);
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setScissor(0, 0, this.width, this.height);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.clear();
    const px = this.renderer.getPixelRatio();
    for (const pane of panes) {
      const { x, y, w, h } = viewport(pane.rect, this.width, this.height, DIVIDE);
      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);
      const f = pane.fighter !== null ? b.fighters[pane.fighter] : undefined;
      const cam = f ? this.cams.get(f.id) : undefined;
      if (!cam) this.show.setAspect(w / h);
      const camera = cam?.camera ?? this.show.camera;
      showTags(fighters.views, b, f ?? null, camera);
      this.effects.setView(camera, h * px);
      this.renderer.render(this.scene, camera);
      if (!f || !cam) continue;
      let hud = this.huds.get(f.id);
      if (!hud) this.huds.set(f.id, (hud = new PaneHud(this.labels.get(f.id)?.color ?? "#ffffff")));
      const aim = crosshair(f, b, camera, w, h);
      hud.draw(this.renderer, w, h, aim?.at ?? null, aim?.gap ?? 0, f.health / 100, f.alive, b.time);
    }
  }

  /** Waits until the graphics card has drawn everything, by reading one pixel back. */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  dispose(): void {
    this.fighters?.dispose();
    for (const hud of this.huds.values()) hud.dispose();
    this.effects?.dispose();
    this.arena?.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    // Browsers cap live WebGL contexts, so a closed room hands its own back now rather than at garbage collection.
    this.renderer.forceContextLoss();
  }
}
