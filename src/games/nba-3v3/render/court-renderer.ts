import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { lineBouncing } from "../engine/free-throw";
import { dist2 } from "../engine/vec";
import { Arena } from "./arena/arena";
import { AthleteView } from "./athlete-view";
import { hanging } from "./arena/hoop";
import { BallView } from "./ball-view";
import { CeremonyStage } from "./ceremony/ceremony-stage";
import type { Ceremony } from "../engine/ceremony";
import { Referee } from "./referee";
import { Effects } from "./effects/effects";
import { applyFilmLook, type CinemaLook } from "./film-look";
import { broadcastShot, lineScene, pressureOn } from "./scene-read";
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
  // Both faces are drawn, so the open ends of the shorts and the jersey never show as see through panels.
  private readonly bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.02, side: THREE.DoubleSide });
  private readonly players = new THREE.Group();
  private readonly environment: THREE.Texture;
  private views: AthleteView[] = [];
  private readonly referee: Referee;
  private match: Match | null = null;
  private intro: number | null = null;
  private time = 0;
  private height = 1;
  private readonly maxPixelRatio: number;
  private readonly pixel = new Uint8Array(4);
  private readonly replayCam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 };
  private readonly ceremony = new CeremonyStage();
  private keyLight: number;
  /** The name across a player's back, or null for the build's own. The host sets it to people's names. */
  jerseyName: (a: Athlete) => string | null = () => null;

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
    this.scene.add(this.arena.group, this.players, this.ball.mesh, this.effects.group, this.ceremony.scene.group);
    this.referee = new Referee(this.bodyMat, this.players);
    this.keyLight = this.arena.key.intensity;
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
    this.views = match.athletes.map((a) => new AthleteView(a, this.bodyMat, this.players, this.jerseyName(a) ?? undefined));
    this.match = match;
    this.effects.reset();
    this.ball.reset();
    this.intro = intro ? 0 : null;
    this.tv.snap(this.shot(match));
  }

  /** Hands the camera to the replay (a position, a point to look at and a lens), or back to the broadcast camera with null. */
  setReplayCamera(cam: { pos: { x: number; y: number; z: number }; look: { x: number; y: number; z: number }; fov: number } | null): void {
    if (!cam) {
      if (this.tv.fixed === this.replayCam) this.tv.fixed = null;
      return;
    }
    this.replayCam.pos.set(cam.pos.x, cam.pos.y, cam.pos.z);
    this.replayCam.look.set(cam.look.x, cam.look.y, cam.look.z);
    this.replayCam.fov = cam.fov;
    this.tv.fixed = this.replayCam;
  }

  /** The showcase's film look (film-look.ts). */
  cinematic(look: CinemaLook = {}): void {
    this.keyLight *= applyFilmLook(this.scene, this.renderer, this.arena, look);
  }

  /** The trophy ceremony to show, run by the host, or null. It takes over the camera while it runs. */
  setCeremony(run: Ceremony | null): void {
    this.ceremony.set(run);
    if (run) this.tv.fixed = this.ceremony.camera;
    else if (this.tv.fixed === this.ceremony.camera) this.tv.fixed = null;
  }

  onEvent(event: MatchEvent): void {
    if (this.match) this.effects.onEvent(event, this.match);
  }

  /**
   * Moves everything on by `dt` of game time, already slowed for slow
   * motion, and draws the frame unless `draw` is false.
   */
  render(dt: number, draw = true): void {
    const m = this.match;
    if (!m) return;
    this.time += dt;
    const b = m.ball;
    const holder = b.holder;
    const onBall = holder !== null ? m.athletes[holder] : null;
    // During the check, and at the free throw line before the shot, the ball is held at the chest, not dribbled,
    // except for the shooter's bounces to settle at the line.
    const shooting = onBall?.action.kind === "shoot";
    const chest = m.phase === "check" || (m.phase === "freeThrow" && !shooting && !lineBouncing(m));
    const pressure = onBall ? pressureOn(m, onBall) : 0;
    const winner = m.phase === "over" && m.phaseT > 1 ? m.winner : null;
    for (const [i, view] of this.views.entries()) {
      const a = m.athletes[i]!;
      const guarding = !!onBall && onBall.team !== a.team && m.phase === "live" && dist2(a, onBall) < 2.6 && a.action.kind === "none";
      const incoming = b.mode === "flight" && b.passTo === a.id && a.action.kind === "none" ? 1 - Math.hypot(b.pos.x - a.x, b.pos.z - a.z) / 3 : 0;
      const line = lineScene(m, a);
      const ceremony = this.ceremony.roleOf(a.id);
      view.update(a, { holding: holder === a.id, chest, receiving: Math.max(0, incoming), guarding, pressure: holder === a.id ? pressure : 0, ...line, winner, ceremony }, dt);
    }
    this.ceremony.update(this.views, dt, this.time);
    // The ball is put away for the ceremony, and the arena's lights come down under the spotlights.
    this.ball.mesh.visible = !this.ceremony.active;
    this.arena.key.intensity = this.keyLight * (1 - this.ceremony.scene.dim);
    this.ball.update(b, holder !== null ? (this.views[holder] ?? null) : null, chest, dt);
    this.referee.update(m, dt);
    if (this.intro !== null) {
      this.intro += dt;
      if (this.intro > 2.8) this.intro = null;
    }
    this.tv.update(this.shot(m), dt, this.time);
    const calm = m.phase === "over" ? 0.6 : m.shotClock < 4 && m.phase === "live" ? 0.45 : 0.18;
    this.arena.hoop.setClock(m.shotClock);
    this.arena.hoop.hold(hanging(m.athletes));
    this.arena.update(dt, this.time, this.ball.mesh.position, calm);
    this.effects.setView(this.height * this.renderer.getPixelRatio(), this.tv.camera.fov);
    this.effects.frame(m, dt);
    if (draw) this.renderer.render(this.scene, this.tv.camera);
  }

  /**
   * Waits until the graphics card has finished the frames asked of it.
   * Only for filming: the capture tool screenshots each frame, and a
   * software renderer can take longer than its patience to catch up.
   */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
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
    return broadcastShot(m, this.intro);
  }

  dispose(): void {
    for (const view of this.views) view.dispose(this.players);
    this.referee.dispose();
    this.ceremony.dispose();
    this.arena.dispose();
    this.ball.dispose();
    this.effects.dispose();
    this.bodyMat.dispose();
    this.environment.dispose();
    this.renderer.dispose();
  }
}
