import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { Arena } from "./arena/arena";
import { arenaEnvironment } from "./arena/arena-environment";
import { AthleteMaterials } from "./materials/athlete-materials";
import type { Quality } from "./quality";
import { AthleteView } from "./athlete-view";
import { hanging } from "./arena/hoop";
import { BallView } from "./ball-view";
import { joltOnContact } from "./contact-jolts";
import { CeremonyStage } from "./ceremony/ceremony-stage";
import type { Ceremony } from "../engine/ceremony";
import { Referee } from "./referee";
import { Effects } from "./effects/effects";
import { applyFilmLook, type CinemaLook } from "./film-look";
import { poseAthletes } from "./athlete-scenes";
import { Picture } from "./picture";
import { BROADCAST_LOOK, CEREMONY_LOOK, REPLAY_LOOK, type Look } from "./post/look";
import { broadcastShot } from "./scene-read";
import { TvCamera, type Shot } from "./tv-camera";

export { LOW_QUALITY, type Quality } from "./quality";

const tmp = new THREE.Vector3();

/**
 * Draws the game: the arena, six players, the ball and every effect,
 * through the broadcast camera. It reads the match each frame and never
 * changes it; events from the match drive the sparks, shakes and cheers.
 */
export class CourtRenderer {
  private readonly picture: Picture;
  private readonly scene = new THREE.Scene();
  readonly arena: Arena;
  readonly tv = new TvCamera();
  private readonly effects: Effects;
  private readonly ball = new BallView();
  private readonly athleteMats: AthleteMaterials;
  private readonly players = new THREE.Group();
  private readonly environment: THREE.Texture;
  private views: AthleteView[] = [];
  private readonly referee: Referee;
  private match: Match | null = null;
  private intro: number | null = null;
  private time = 0;
  private height = 1;
  private lastLook: Readonly<Look> | null = null;
  private readonly pixel = new Uint8Array(4);
  private readonly replayCam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 };
  private readonly ceremony = new CeremonyStage();
  private keyLight: number;
  /** The name across a player's back, or null for the build's own. The host sets it to people's names. */
  jerseyName: (a: Athlete) => string | null = () => null;

  constructor(canvas: HTMLCanvasElement, quality: Quality = {}) {
    const { reflections = true, athletes = "high", mirror = 0.5 } = quality;
    this.athleteMats = new AthleteMaterials(athletes);
    this.picture = new Picture(canvas, quality);
    this.arena = new Arena(mirror);
    this.environment = arenaEnvironment(this.picture.renderer);
    if (reflections) this.scene.environment = this.environment;
    this.scene.background = new THREE.Color("#060812");
    this.scene.fog = new THREE.FogExp2("#060812", 0.014);
    this.effects = new Effects(this.arena, this.tv);
    this.scene.add(this.arena.group, this.players, this.ball.mesh, this.effects.group, this.ceremony.scene.group);
    this.referee = new Referee(this.athleteMats, this.players);
    this.keyLight = this.arena.key.intensity;
  }

  resize(width: number, height: number, dpr: number): void {
    this.height = Math.max(1, height);
    this.picture.resize(width, height, dpr);
    this.tv.setAspect(Math.max(1, width) / this.height);
  }

  /** Shows a match, building its players the first time it is seen. */
  setMatch(match: Match, intro = false): void {
    if (match === this.match) return;
    for (const view of this.views) view.dispose(this.players);
    this.views = match.athletes.map((a) => new AthleteView(a, this.athleteMats, this.players, this.jerseyName(a) ?? undefined));
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
    const film = applyFilmLook(this.scene, this.arena, look);
    this.keyLight *= film.key;
    this.picture.setExposureScale(film.exposure);
  }

  /** The trophy ceremony to show, run by the host, or null. It takes over the camera while it runs. */
  setCeremony(run: Ceremony | null): void {
    this.ceremony.set(run);
    if (run) this.tv.fixed = this.ceremony.camera;
    else if (this.tv.fixed === this.ceremony.camera) this.tv.fixed = null;
  }

  onEvent(event: MatchEvent): void {
    if (!this.match) return;
    this.effects.onEvent(event, this.match);
    joltOnContact(event, this.match, this.views);
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
    const chest = poseAthletes(m, this.views, this.ceremony, dt);
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
    this.effects.setView(this.height * this.picture.pixelRatio, this.tv.camera.fov);
    this.effects.frame(m, dt);
    this.grade(dt);
    if (draw) this.picture.draw(this.scene, this.tv.camera, () => this.arena.reflect(this.picture.renderer, this.scene, this.tv.camera));
  }

  /** The replay and the ceremony have their own grade, with the subject in focus; a cut changes it at once. */
  private grade(dt: number): void {
    const fixed = this.tv.fixed;
    const look = this.ceremony.active ? CEREMONY_LOOK : fixed === this.replayCam ? REPLAY_LOOK : BROADCAST_LOOK;
    this.picture.grade(look, dt, look !== this.lastLook);
    this.lastLook = look;
    if (fixed) {
      const distance = this.tv.camera.position.distanceTo(fixed.look);
      this.picture.focus(distance, 1 + distance * 0.35);
    }
  }

  /**
   * Waits until the graphics card has finished the frames asked of it.
   * Only for filming: the capture tool screenshots each frame, and a
   * software renderer can take longer than its patience to catch up.
   */
  finish(): void {
    this.picture.finish(this.pixel);
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
    this.athleteMats.dispose();
    this.environment.dispose();
    this.picture.dispose();
  }
}
