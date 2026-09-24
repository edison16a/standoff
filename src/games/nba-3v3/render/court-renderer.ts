import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { dist2 } from "../engine/vec";
import { Arena } from "./arena/arena";
import { AthleteView } from "./athlete-view";
import { BallView } from "./ball-view";
import { Effects } from "./effects/effects";
import { TvCamera, type Shot } from "./tv-camera";

const tmp = new THREE.Vector3();

/** Rendering features that can be turned off for weak graphics hardware. */
export interface Quality {
  antialias?: boolean;
  shadows?: boolean;
  /** Glossy reflections of the arena on the floor, the ball and the rim. */
  reflections?: boolean;
  /** The most device pixels drawn per CSS pixel. */
  maxPixelRatio?: number;
}

/** For computers that draw WebGL in software: a smaller picture without antialiasing or shadows. */
export const LOW_QUALITY: Quality = { antialias: false, shadows: false, maxPixelRatio: 0.6 };

/**
 * Draws the game: the arena, six players, the ball and every effect,
 * through the broadcast camera. It reads the match each frame and never
 * changes it; events from the match drive the sparks, shakes and cheers.
 */
export class CourtRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly arena = new Arena();
  readonly tv = new TvCamera();
  private readonly effects: Effects;
  private readonly ball = new BallView();
  private readonly bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.02 });
  private readonly players = new THREE.Group();
  private readonly environment: THREE.Texture;
  private views: AthleteView[] = [];
  private match: Match | null = null;
  private intro: number | null = null;
  private time = 0;
  private height = 1;
  private readonly maxPixelRatio: number;

  constructor(canvas: HTMLCanvasElement, quality: Quality = {}) {
    const { antialias = true, shadows = true, reflections = true, maxPixelRatio = 1.75 } = quality;
    this.maxPixelRatio = maxPixelRatio;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    if (reflections) this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.32;
    this.scene.background = new THREE.Color("#060812");
    this.scene.fog = new THREE.FogExp2("#060812", 0.014);
    this.effects = new Effects(this.arena, this.tv);
    this.scene.add(this.arena.group, this.players, this.ball.mesh, this.effects.group);
  }

  resize(width: number, height: number, dpr: number): void {
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(Math.min(dpr, this.maxPixelRatio));
    this.renderer.setSize(Math.max(1, width), this.height, false);
    this.tv.setAspect(Math.max(1, width) / this.height);
  }

  /** Shows a match, building its players the first time it is seen. */
  setMatch(match: Match, intro = false): void {
    if (match === this.match) return;
    for (const view of this.views) view.dispose(this.players);
    this.views = match.athletes.map((a) => new AthleteView(a, this.bodyMat, this.players));
    this.match = match;
    this.effects.reset();
    this.intro = intro ? 0 : null;
    this.tv.snap(this.shot(match));
  }

  onEvent(event: MatchEvent): void {
    if (this.match) this.effects.onEvent(event, this.match);
  }

  /** Draws one frame. `dt` is game time, already slowed for slow motion. */
  render(dt: number): void {
    const m = this.match;
    if (!m) return;
    this.time += dt;
    const holder = m.ball.holder;
    const onBall = holder !== null ? m.athletes[holder] : null;
    for (const [i, view] of this.views.entries()) {
      const a = m.athletes[i]!;
      const guarding = !!onBall && onBall.team !== a.team && m.phase === "live" && dist2(a, onBall) < 2.6 && a.action.kind === "none";
      view.update(a, { holding: holder === a.id, guarding, winner: m.phase === "over" && m.phaseT > 1 ? m.winner : null }, dt);
    }
    this.ball.update(m.ball, holder !== null ? (this.views[holder] ?? null) : null, dt);
    if (this.intro !== null) {
      this.intro += dt;
      if (this.intro > 2.8) this.intro = null;
    }
    this.tv.update(this.shot(m), dt, this.time);
    const calm = m.phase === "over" ? 0.6 : m.shotClock < 4 && m.phase === "live" ? 0.45 : 0.18;
    this.arena.hoop.setClock(m.shotClock);
    this.arena.update(dt, this.time, this.ball.mesh.position, calm);
    this.effects.setView(this.height * this.renderer.getPixelRatio(), this.tv.camera.fov);
    this.effects.frame(m, dt);
    this.renderer.render(this.scene, this.tv.camera);
  }

  /** Where a world point lands on the canvas, in CSS pixels from the top left, or null behind the camera. */
  project(point: THREE.Vector3, width: number, height: number): { x: number; y: number } | null {
    tmp.copy(point).project(this.tv.camera);
    if (tmp.z > 1) return null;
    return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height };
  }

  /** The point above a player's head where their tag floats. */
  tagPoint(id: number, out: THREE.Vector3): THREE.Vector3 | null {
    return this.views[id]?.tagPoint(out) ?? null;
  }

  private shot(m: Match): Shot {
    const b = m.ball;
    const dunker = m.athletes.find((a) => a.action.kind === "drive" && a.action.dunk && a.action.t > a.action.takeoff * 0.5);
    let winners: Shot["winners"] = null;
    if (m.phase === "over" && m.winner !== null && m.phaseT > 1.5) {
      const side = m.athletes.filter((a: Athlete) => a.team === m.winner);
      winners = { x: side.reduce((s, a) => s + a.x, 0) / side.length, z: side.reduce((s, a) => s + a.z, 0) / side.length };
    }
    return { focus: b.pos, dunker: dunker ? { x: dunker.x, z: dunker.z } : null, winners, intro: this.intro };
  }

  dispose(): void {
    for (const view of this.views) view.dispose(this.players);
    this.arena.dispose();
    this.ball.dispose();
    this.effects.dispose();
    this.bodyMat.dispose();
    this.environment.dispose();
    this.renderer.dispose();
  }
}
