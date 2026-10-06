import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { MatchView } from "../engine/view";
import { TEAMS } from "../teams";
import { Arena } from "./arena/arena";
import { stadiumEnvironment } from "./arena/environment";
import { excitement } from "./arena/crowd-mood";
import { AthleteMaterials } from "./body/materials";
import { CameraDirector, type Shot } from "./camera/director";
import { CeremonyScene } from "./ceremony/ceremony-scene";
import { Effects } from "./effects/effects";
import { applyFilmLook, type CinemaLook } from "./film-look";
import { AimLine } from "./figures/aim-line";
import { AimMarker } from "./figures/aim-marker";
import { RefereeFigure } from "./figures/referee-figure";
import { Squad, type Label } from "./figures/squad";
import { BallModel } from "./models/ball-model";
import { Picture, type PictureOptions } from "./picture";

export type { Label };

export type RendererOptions = PictureOptions;

/**
 * Draws the match: the floodlit ground, the players and keepers, the
 * ball, the effects and the broadcast camera. It only ever reads match
 * views, so live play and replays go through the same drawing.
 */
export class MatchRenderer {
  readonly director = new CameraDirector();
  private readonly picture: Picture;
  private readonly scene = new THREE.Scene();
  private readonly arena: Arena;
  private readonly effects: Effects;
  private readonly ball: BallModel;
  private readonly squad: Squad;
  private readonly referee: RefereeFigure;
  private readonly bodies: AthleteMaterials;
  private readonly aim = new AimLine();
  private readonly marker = new AimMarker();
  private readonly ceremony = new CeremonyScene();
  private readonly handL = new THREE.Vector3();
  private readonly handR = new THREE.Vector3();
  private markerAt: { x: number; y: number; z: number } | null = null;
  private readonly environment: THREE.Texture;
  private last = 0;
  private shot: Shot = "tv";
  private dt = 0;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.picture = new Picture(canvas, options);
    const low = this.picture.low;
    this.environment = stadiumEnvironment(this.picture.renderer);
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.5;
    this.scene.fog = new THREE.Fog("#0b1024", 70, 220);
    this.arena = new Arena(low);
    this.effects = new Effects(this.arena.glow);
    this.ball = new BallModel(this.arena.glow);
    this.bodies = new AthleteMaterials(!low);
    this.squad = new Squad(this.arena.glow, this.bodies);
    this.referee = new RefereeFigure(this.bodies);
    this.scene.add(this.arena.group, this.effects.group, this.ball.group, this.squad.group, this.referee.group, this.aim.group, this.marker.group, this.ceremony.group);
  }

  /** The showcase's film look (film-look.ts). */
  cinematic(look: CinemaLook = {}): void {
    applyFilmLook(this.scene, this.picture, this.arena, look);
  }

  /** The replay's target on the goal, shown through the strike, or null to hide it. */
  setMarker(at: { x: number; y: number; z: number } | null): void {
    this.markerAt = at;
  }

  resize(width: number, height: number, dpr: number): void {
    this.picture.resize(width, height, dpr);
    this.director.setAspect(width / Math.max(1, height));
  }

  /** Names and colours for the tags over each player, by athlete id. */
  setLabels(label: (id: number) => Label): void {
    this.squad.setLabels(label);
  }

  onEvent(event: MatchEvent, view: MatchView): void {
    this.effects.onEvent(event, view);
    this.squad.onEvent(event, view);
    if (event.type === "goal") {
      this.arena.boards.flash(TEAMS[event.team].color);
      this.director.bump(0.6);
    }
    if (event.type === "woodwork") {
      this.director.bump(0.5);
      this.arena.goals[event.at.x < 0 ? 0 : 1].ring(event.speed);
    }
    if (event.type === "kickoff") {
      this.effects.reset();
      this.arena.boards.calm();
    }
  }

  /** Lets the sound bang with each firework as it bursts. */
  onFirework(listener: (() => void) | null): void {
    this.effects.fireworks.onBurst = listener ? () => listener() : null;
  }

  draw(view: MatchView, shot: Shot, nowMs: number, focus?: THREE.Vector3, tags = true): void {
    this.advance(view, shot, nowMs, focus, tags);
    this.picture.draw(this.scene, this.director.camera, this.shot, this.director.target, this.dt);
  }

  /** Everything a frame does except drawing it: the camera, the bodies and the effects move on. */
  update(view: MatchView, shot: Shot, nowMs: number, focus?: THREE.Vector3, tags = true): void {
    this.advance(view, shot, nowMs, focus, tags);
  }

  /**
   * Plays a frozen moment forward for a while without drawing, so the
   * players' poses, which ease toward their targets, settle before a
   * still is drawn once.
   */
  settle(view: MatchView, nowMs: number, seconds: number): void {
    // Only the bodies and the ball: the boards and effects would queue work for the graphics card on every pass.
    for (let t = 0; t < seconds; t += 1 / 30) {
      this.squad.update(view, 1 / 30, (nowMs - (seconds - t) * 1000) / 1000, false);
      this.ball.update(view.ball, 1 / 30);
    }
  }

  private advance(view: MatchView, shot: Shot, nowMs: number, focus: THREE.Vector3 | undefined, tags: boolean): void {
    const raw = this.last ? Math.max(0, nowMs - this.last) / 1000 : 0;
    const dt = this.last ? Math.min(0.1, raw) : 1 / 60;
    this.picture.frame(raw);
    this.last = nowMs;
    this.shot = shot;
    this.dt = raw;
    const time = nowMs / 1000;
    this.squad.update(view, dt, time, tags && shot !== "replay-kicker" && shot !== "replay-keeper");
    const captain = view.ceremony?.captain ?? null;
    const holding = captain !== null && this.squad.hands(captain, this.handL, this.handR);
    this.ceremony.update(view.ceremony, holding ? this.handL : null, holding ? this.handR : null, dt, time);
    this.marker.update(this.markerAt, time);
    // No referee on the lobby's kick about, and he leaves the trophy to the players.
    this.referee.group.visible = shot !== "lobby" && !view.ceremony;
    this.referee.update(view.referee, view.ball, dt, time);
    this.aim.update(view.setPiece, time);
    this.ball.update(view.ball, dt);
    this.arena.update(view.nets, dt, time);
    this.arena.crowd.setExcitement(excitement(view));
    this.effects.frame(view, dt, time);
    this.director.update(view, shot, dt, time, focus);
    const fine = this.picture.fineBodies;
    const pixels = this.picture.renderer.domElement.height;
    this.squad.fitView(this.director.camera, pixels, fine);
    this.referee.fitDetail(this.director.camera, pixels, fine);
    this.squad.stackTags(this.director.camera, dt);
  }

  /** What the last frame cost the graphics card, shadows included, and what it holds: for development checks of the frame budget. */
  stats(): { calls: number; triangles: number; geometries: number; textures: number; programs: number } {
    const { render, memory, programs } = this.picture.renderer.info;
    return { calls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures, programs: programs?.length ?? 0 };
  }

  /** Where a player stands, for the close up camera. */
  focusOn(view: MatchView, id: number | null): THREE.Vector3 | undefined {
    const a = id !== null ? view.athletes[id] : undefined;
    return a ? new THREE.Vector3(a.x, 0, a.z) : undefined;
  }

  dispose(): void {
    this.ceremony.dispose();
    this.squad.dispose();
    this.referee.dispose();
    this.bodies.dispose();
    this.aim.dispose();
    this.marker.dispose();
    this.ball.dispose();
    this.effects.dispose();
    this.arena.dispose();
    this.environment.dispose();
    this.picture.dispose();
  }
}
