import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { RaceEvent } from "../engine/events";
import type { RaceWorld } from "../engine/world";
import { Effects } from "./effects/effects";
import { KartExtras } from "./kart-extras";
import { KartLook } from "./kart-look";
import { KartView } from "./kart-view";
import { CubeView } from "./props/cube-view";
import { ObstacleView } from "./props/obstacle-view";
import { ProjectileView } from "./props/projectile-view";
import { TrackScene } from "./track-scene";
import { ViewCameras, type ViewSpec } from "./view-cameras";

export type { ViewSpec };

export interface Label {
  name: string;
  color: string;
}

/**
 * Draws the race. One WebGLRenderer and one scene serve every player: each
 * view is a scissored viewport with its own chase camera, so four players
 * cost four draws of shared geometry and nothing more.
 */
export class GameRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly extras = new KartExtras();
  private readonly dynamic = new THREE.Group();
  private stage: TrackScene | null = null;
  private world: RaceWorld | null = null;
  private karts = new Map<number, KartView>();
  private cubes: CubeView | null = null;
  private obstacles: ObstacleView | null = null;
  private readonly projectiles = new ProjectileView();
  private effects: Effects | null = null;
  private readonly cameras = new ViewCameras();
  private width = 1;
  private height = 1;
  private last = 0;
  /** Name tags over the karts. The showcase turns them off for a clean shot. */
  tags = true;
  /**
   * Steps quality down on a machine that cannot hold the frame rate. The
   * showcase turns it off, since the capture tool's clock is not real time.
   */
  adaptive = true;
  private readonly look = new KartLook();
  private dpr = 1;
  /** A soft studio light the scenery reflects, so shiny props shine on every map, night ones included. */
  private readonly environment: THREE.Texture;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setScissorTest(true);
    // Counted across all views of a frame, not per view, so drawCalls is the whole frame's cost.
    this.renderer.info.autoReset = false;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.dynamic.add(this.projectiles.group);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    // Four views at full retina resolution is too much for a laptop; cap the density.
    this.dpr = Math.min(dpr, 1.5);
    this.renderer.setPixelRatio(this.dpr * this.look.quality.current.resolution);
    this.renderer.setSize(this.width, this.height, false);
  }

  /** Switches to a race (or the lobby's demo race), rebuilding the map only when it changed. */
  setWorld(world: RaceWorld, label: (kartId: number) => Label): void {
    if (world === this.world) return;
    if (this.stage?.def.id !== world.track.def.id) {
      this.stage?.scene.remove(this.dynamic);
      this.stage?.dispose();
      this.stage = new TrackScene(world.track.def);
      this.stage.scene.add(this.dynamic);
      this.stage.scene.environment = this.environment;
      this.stage.scene.environmentIntensity = this.stage.theme.reflections;
      this.look.setMap(this.renderer, this.stage.theme);
    }
    for (const view of this.karts.values()) view.dispose(this.dynamic);
    this.karts = new Map(world.karts.map((kart) => {
      const { name, color } = label(kart.id);
      const view = new KartView(kart.id, kart, name, color, this.extras, this.dynamic);
      this.look.dress(view);
      return [kart.id, view];
    }));
    for (const prop of [this.cubes, this.obstacles, this.effects]) {
      if (!prop) continue;
      this.dynamic.remove(prop.group);
      prop.dispose();
    }
    this.cubes = new CubeView(world.cubes);
    this.obstacles = new ObstacleView(world.obstacles);
    this.effects = new Effects(this.stage!.theme.shoulder, this.stage!.theme.reflections >= 0.7);
    this.dynamic.add(this.cubes.group, this.obstacles.group, this.effects.group);
    this.cameras.reset();
    // A new race may run on its own clock, so the next frame must not measure its time from the old one.
    this.last = 0;
    // Throw ids start again from 1 in every race, so last race's throws must not be mistaken for new ones.
    this.projectiles.clear();
    this.look.quality.restart();
    this.world = world;
  }

  onEvent(event: RaceEvent): void {
    if (!this.world) return;
    this.effects?.onEvent(event, this.world, this.karts);
    if (event.type === "hit" || event.type === "fell") this.cameras.following(event.kart)?.bump(event.type === "hit" ? 1 : 0.5);
    if (event.type === "land" && event.airTime > 0.6) this.cameras.following(event.kart)?.bump(0.35);
    if (event.type === "respawn") this.cameras.snapTo(event.kart);
  }

  render(views: readonly ViewSpec[], nowMs: number): void {
    const world = this.world;
    const stage = this.stage;
    if (!world || !stage) return;
    const frameS = this.last ? (nowMs - this.last) / 1000 : 0.016;
    const dt = Math.min(0.05, frameS);
    // The cameras smooth over the real frame time (up to the race's own catch up of a quarter
    // second), so on a slow machine they keep up with the kart instead of trailing it.
    const cameraDt = Math.min(0.25, frameS);
    if (this.adaptive && this.last && this.look.quality.sample(frameS * 1000)) {
      this.resize(this.width, this.height, this.dpr);
      for (const view of this.karts.values()) this.look.dress(view);
    }
    this.last = nowMs;
    const time = nowMs / 1000;
    for (const kart of world.karts) this.karts.get(kart.id)?.update(kart, world.track, dt, time);
    this.cubes?.update(time);
    this.obstacles?.update(time, (s) => {
      const f = world.track.frameAt(s);
      return Math.atan2(f.tx, f.tz);
    });
    this.projectiles.update(world.projectiles, time);
    this.extras.tick(time);
    this.effects?.frame(world, this.karts, dt);
    stage.animate(time);
    this.dynamic.updateMatrixWorld(true);

    this.renderer.info.reset();
    this.cameras.begin(views);
    const px = this.renderer.getPixelRatio();
    views.forEach((view, i) => {
      const x = Math.round(view.rect.x * this.width);
      const w = Math.round(view.rect.w * this.width);
      const h = Math.round(view.rect.h * this.height);
      const y = Math.round((1 - view.rect.y - view.rect.h) * this.height);
      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);
      const camera = this.cameras.pick(view, i, w / h, world, time, cameraDt);
      // The show camera rides behind the leader, so that kart is the one this view is about: no tag over it.
      const followed = view.kartId ?? (view.camera ? null : (world.standings[0]?.id ?? null));
      // A smaller view shows a kart smaller, so it can switch to the coarse cut sooner.
      for (const kv of this.karts.values()) kv.setViewer(followed, camera.position, this.tags, h / 1080);
      this.effects?.setView(h * px, camera.fov);
      stage.follow(camera);
      this.renderer.render(stage.scene, camera);
    });
    this.cameras.end();
  }

  /** Draw calls in the last frame, all views together. */
  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  /** Waits until the graphics card has drawn everything asked of it, by reading one pixel back. */
  finish(): void {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  dispose(): void {
    for (const view of this.karts.values()) view.dispose(this.dynamic);
    this.cubes?.dispose();
    this.obstacles?.dispose();
    this.effects?.dispose();
    this.projectiles.dispose();
    this.extras.dispose();
    this.environment.dispose();
    this.look.dispose();
    this.stage?.scene.remove(this.dynamic);
    this.stage?.dispose();
    this.renderer.dispose();
  }
}
