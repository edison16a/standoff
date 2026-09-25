import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { TEAMS } from "../teams";
import { Arena } from "./arena/arena";
import { CameraDirector, type Shot } from "./camera/director";
import { Effects } from "./effects/effects";
import { Squad, type Label } from "./figures/squad";
import { BallModel } from "./models/ball-model";

export type { Label };

export interface RendererOptions {
  /**
   * "low" drops shadows, antialiasing, the crowd and the light beams and
   * draws at a lower resolution, for software graphics in browser tests.
   * "film" is "high" without antialiasing, for the showcase: the capture
   * tool renders it in software, and the video encoder softens edges anyway.
   */
  quality?: "high" | "low" | "film";
}

/**
 * Draws the match: the floodlit ground, the players and keepers, the
 * ball, the effects and the broadcast camera. It only ever reads match
 * views, so live play and replays go through the same drawing.
 */
export class MatchRenderer {
  readonly director = new CameraDirector();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly arena: Arena;
  private readonly effects: Effects;
  private readonly ball: BallModel;
  private readonly squad: Squad;
  private readonly environment: THREE.Texture;
  private last = 0;
  private readonly low: boolean;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.low = options.quality === "low";
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: options.quality !== "low" && options.quality !== "film", powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.35;
    this.scene.fog = new THREE.Fog("#0b1024", 70, 220);
    this.arena = new Arena(this.low);
    this.effects = new Effects(this.arena.glow);
    this.ball = new BallModel(this.arena.glow);
    this.squad = new Squad(this.arena.glow);
    this.scene.add(this.arena.group, this.effects.group, this.ball.group, this.squad.group);
  }

  resize(width: number, height: number, dpr: number): void {
    const ratio = this.low ? 0.6 : Math.min(dpr, 1.5);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.director.setAspect(width / Math.max(1, height));
  }

  /** Names and colours for the tags over each player, by athlete id. */
  setLabels(label: (id: number) => Label): void {
    this.squad.setLabels(label);
  }

  onEvent(event: MatchEvent, view: MatchView): void {
    this.effects.onEvent(event, view);
    if (event.type === "goal") {
      this.arena.boards.flash(TEAMS[event.team].color);
      this.director.bump(0.6);
    }
    if (event.type === "woodwork") this.director.bump(0.5);
    if (event.type === "kickoff") this.effects.reset();
  }

  /** Lets the sound bang with each firework as it bursts. */
  onFirework(listener: (() => void) | null): void {
    this.effects.fireworks.onBurst = listener ? () => listener() : null;
  }

  draw(view: MatchView, shot: Shot, nowMs: number, focus?: THREE.Vector3, tags = true): void {
    const dt = this.last ? Math.min(0.1, (nowMs - this.last) / 1000) : 1 / 60;
    this.last = nowMs;
    const time = nowMs / 1000;
    this.squad.update(view, dt, time, tags && shot !== "replay-end" && shot !== "replay-side");
    this.ball.update(view.ball, dt);
    this.arena.update(view.ball, dt, time);
    this.arena.crowd.setExcitement(excitement(view));
    this.effects.frame(view, dt, time);
    this.director.update(view, shot, dt, time, focus);
    this.squad.fitTags(this.director.camera.fov);
    this.renderer.render(this.scene, this.director.camera);
  }

  /** Where a player stands, for the close up camera. */
  focusOn(view: MatchView, id: number | null): THREE.Vector3 | undefined {
    const a = id !== null ? view.athletes[id] : undefined;
    return a ? new THREE.Vector3(a.x, 0, a.z) : undefined;
  }

  dispose(): void {
    this.squad.dispose();
    this.ball.dispose();
    this.effects.dispose();
    this.arena.dispose();
    this.environment.dispose();
    this.renderer.dispose();
  }
}

/** How loud and bouncy the crowd is: a hum, rising as the ball nears a goal, and wild for goals. */
function excitement(view: MatchView): number {
  if (view.phase === "goal") return 1;
  if (view.phase === "fulltime") return 0.9;
  const nearGoal = Math.max(0, (Math.abs(view.ball.x) - 8) / 8);
  return 0.12 + 0.35 * nearGoal;
}
