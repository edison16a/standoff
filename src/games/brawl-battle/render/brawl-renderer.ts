import * as THREE from "three";
import { RESPAWN, RULES } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { CHARACTERS } from "../roster";
import { FrameCamera, type Subject } from "./camera/frame-camera";
import { fighterColours, type FighterColours } from "./colors";
import { Effects } from "./effects/effects";
import { FighterView } from "./fighter-view";
import { glowMaterial } from "./models/geo";
import { ProjectileView } from "./projectile-view";
import { StageScene } from "./stages/scenery";

/** Rendering features that can be turned off for weak graphics hardware. */
export interface Quality {
  antialias?: boolean;
  /** The most device pixels drawn per CSS pixel. */
  maxPixelRatio?: number;
}

/** For computers that draw WebGL in software: a smaller picture without antialiasing. */
export const LOW_QUALITY: Quality = { antialias: false, maxPixelRatio: 0.6 };

const tmp = new THREE.Vector3();

/**
 * Draws a match: the stage, the fighters, bolts and every effect,
 * through the framing camera. It reads the match and never changes it.
 * The host calls `beforeStep` and `afterStep` round each engine step,
 * so motion blends smoothly between steps and events turn into sparks.
 */
export class BrawlRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly cam = new FrameCamera();
  private readonly effects = new Effects(this.cam);
  private readonly glow = glowMaterial();
  private readonly world = new THREE.Group();
  private readonly projectiles = new ProjectileView(this.effects);
  private stage: StageScene | null = null;
  private views: FighterView[] = [];
  private match: MatchState | null = null;
  private time = 0;
  private height = 1;
  private readonly maxPixelRatio: number;
  private readonly pixel = new Uint8Array(4);
  colours: FighterColours[] = [];

  constructor(canvas: HTMLCanvasElement, quality: Quality = {}) {
    const { antialias = true, maxPixelRatio = 1.6 } = quality;
    this.maxPixelRatio = maxPixelRatio;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(this.world, this.projectiles.group, this.effects.group);
  }

  resize(width: number, height: number, dpr: number): void {
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(dpr, this.maxPixelRatio));
    this.renderer.setSize(Math.max(1, width), this.height, false);
    this.cam.setAspect(Math.max(1, width) / this.height);
  }

  /** How many CSS pixels along the bottom of the canvas the HUD covers, so the camera frames the fight above it. */
  setHudInset(px: number): void {
    this.cam.hidden = Math.max(0, px) / this.height;
  }

  /** Shows a match, building its stage and fighters the first time it is seen. */
  setMatch(state: MatchState): void {
    if (state === this.match) return;
    this.clear();
    this.match = state;
    this.stage = new StageScene(state.stage);
    this.scene.fog = this.stage.fog;
    this.world.add(this.stage.group);
    this.colours = fighterColours(state.fighters);
    this.effects.setColours(this.colours);
    this.views = state.fighters.map((f) => new FighterView(f, this.colours[f.id]!, this.glow, this.world, this.effects));
    this.cam.update(state.stage, this.subjects(state), 1, { snap: true, zoom: 1.6 });
  }

  beforeStep(): void {
    const m = this.match;
    if (!m) return;
    for (const f of m.fighters) this.views[f.id]?.remember(f);
    this.projectiles.remember(m);
  }

  /** Turns the last step's events into effects and animation cues. */
  afterStep(): void {
    const m = this.match;
    if (!m) return;
    for (const e of m.events) {
      if (e.type === "jump") this.views[e.id]?.onJump(e.double, m.frame);
      else if (e.type === "land") this.views[e.id]?.onLand();
      else if (e.type === "hit") {
        this.views[e.target]?.onHit();
        if (e.heavy) this.cam.punch(e.x, e.y, 0.05 + e.freeze * 0.004);
      }
      this.effects.onEvent(e, m);
    }
  }

  /**
   * Moves everything on by `dt` seconds and draws the frame unless
   * `draw` is false. `alpha` is how far the clock is between the last
   * engine step and the next, from 0 to 1.
   */
  render(dt: number, alpha: number, draw = true): void {
    const m = this.match;
    if (!m || !this.stage) return;
    this.time += dt;
    for (const f of m.fighters) this.views[f.id]?.update(f, m, alpha, dt, this.time);
    this.projectiles.update(m, alpha, this.time);
    const intro = m.phase === "ready" ? Math.max(0, 1 - m.phaseFrame / (RULES.countdown * 0.6)) : 0;
    const winner = m.phase !== "fight" && m.phase !== "ready" && m.winner !== null ? m.fighters[m.winner] : null;
    const subjects = winner ? [{ x: winner.pos.x, y: winner.pos.y }] : this.subjects(m);
    this.cam.update(m.stage, subjects, dt, { zoom: 1 + intro * intro * 0.8, close: !!winner });
    this.stage.update(this.time, dt, this.cam.camera.position);
    this.effects.setView(this.height * this.renderer.getPixelRatio(), this.cam.camera.fov);
    this.effects.update(dt);
    if (draw) this.renderer.render(this.scene, this.cam.camera);
  }

  /** Where a world point lands on the canvas, in CSS pixels from the top left, or null behind the camera. */
  project(point: THREE.Vector3, width: number, height: number): { x: number; y: number } | null {
    tmp.copy(point).project(this.cam.camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height };
  }

  /** The point over a fighter's head, for a name tag, or null while they are gone. */
  headPoint(id: number, out: THREE.Vector3): THREE.Vector3 | null {
    const f = this.match?.fighters[id];
    const root = this.views[id]?.rig.joints.root;
    if (!f || !root || !root.visible) return null;
    return out.set(root.position.x, root.position.y + CHARACTERS[f.character].physique.height + 0.9, 0);
  }

  /** Waits for the graphics card to finish, for filming frame by frame. */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
  }

  /** Fighters still in play, and respawn platforms on their way down. */
  private subjects(m: MatchState): Subject[] {
    const out: Subject[] = [];
    for (const f of m.fighters) {
      if (f.action === "out") continue;
      if (f.action === "dead") continue;
      // A platform high above stays out of the framing until it is nearly down.
      if (f.action === "respawn" && f.frame < RESPAWN.descend * 0.5) continue;
      out.push({ x: f.pos.x, y: f.pos.y });
    }
    return out;
  }

  private clear(): void {
    for (const v of this.views) v.dispose(this.world);
    this.views = [];
    if (this.stage) {
      this.world.remove(this.stage.group);
      this.stage.dispose();
      this.stage = null;
    }
    this.effects.reset();
  }

  dispose(): void {
    this.clear();
    this.projectiles.dispose();
    this.effects.dispose();
    this.glow.dispose();
    this.renderer.dispose();
  }
}
