import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { RaceEvent } from "../engine/events";
import type { RaceWorld } from "../engine/world";
import { ShowCamera } from "./cameras";
import { ChaseCamera } from "./chase-camera";
import { Effects } from "./effects/effects";
import { KartExtras } from "./kart-extras";
import { KartView } from "./kart-view";
import type { ViewRect } from "./layout";
import { CubeView } from "./props/cube-view";
import { ObstacleView } from "./props/obstacle-view";
import { ProjectileView } from "./props/projectile-view";
import { TrackScene } from "./track-scene";

export interface Label {
  name: string;
  color: string;
}

/** One viewport: whose kart it follows (null for the lobby's show camera) and where it sits. */
export interface ViewSpec {
  kartId: number | null;
  rect: ViewRect;
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
  private chase: ChaseCamera[] = [];
  private readonly show = new ShowCamera();
  private width = 1;
  private height = 1;
  private last = 0;
  /** A soft studio light the karts reflect, so their paint shines on every map, night ones included. */
  private readonly environment: THREE.Texture;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setScissorTest(true);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.dynamic.add(this.projectiles.group);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    // Four views at full retina resolution is too much for a laptop; cap the density.
    this.renderer.setPixelRatio(Math.min(dpr, 1.5));
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
    }
    for (const view of this.karts.values()) view.dispose(this.dynamic);
    this.karts = new Map(world.karts.map((kart) => {
      const { name, color } = label(kart.id);
      return [kart.id, new KartView(kart.id, kart, name, color, this.extras, this.dynamic)];
    }));
    for (const prop of [this.cubes, this.obstacles, this.effects]) {
      if (!prop) continue;
      this.dynamic.remove(prop.group);
      prop.dispose();
    }
    this.cubes = new CubeView(world.cubes);
    this.obstacles = new ObstacleView(world.obstacles);
    this.effects = new Effects(this.stage!.theme.shoulder);
    this.dynamic.add(this.cubes.group, this.obstacles.group, this.effects.group);
    this.chase = [];
    this.show.reset();
    this.world = world;
  }

  onEvent(event: RaceEvent): void {
    if (!this.world) return;
    this.effects?.onEvent(event, this.world);
    if (event.type === "hit" || event.type === "fell") this.cameraFor(event.kart)?.bump(event.type === "hit" ? 1 : 0.5);
    if (event.type === "land" && event.airTime > 0.6) this.cameraFor(event.kart)?.bump(0.35);
    if (event.type === "respawn") this.snap.add(event.kart);
  }

  private readonly snap = new Set<number>();
  private viewKarts: (number | null)[] = [];

  private cameraFor(kartId: number): ChaseCamera | undefined {
    const index = this.viewKarts.indexOf(kartId);
    return index >= 0 ? this.chase[index] : undefined;
  }

  render(views: readonly ViewSpec[], nowMs: number): void {
    const world = this.world;
    const stage = this.stage;
    if (!world || !stage) return;
    const dt = Math.min(0.05, this.last ? (nowMs - this.last) / 1000 : 0.016);
    this.last = nowMs;
    const time = nowMs / 1000;
    for (const kart of world.karts) this.karts.get(kart.id)?.update(kart, world.track, dt, time);
    this.cubes?.update(time);
    this.obstacles?.update(time, (s) => {
      const f = world.track.frameAt(s);
      return Math.atan2(f.tx, f.tz);
    });
    this.projectiles.update(world.projectiles, time);
    this.effects?.frame(world, this.karts, dt);
    stage.animate(time);
    this.dynamic.updateMatrixWorld(true);

    this.viewKarts = views.map((v) => v.kartId);
    while (this.chase.length < views.length) this.chase.push(new ChaseCamera());
    const px = this.renderer.getPixelRatio();
    views.forEach((view, i) => {
      const x = Math.round(view.rect.x * this.width);
      const w = Math.round(view.rect.w * this.width);
      const h = Math.round(view.rect.h * this.height);
      const y = Math.round((1 - view.rect.y - view.rect.h) * this.height);
      this.renderer.setViewport(x, y, w, h);
      this.renderer.setScissor(x, y, w, h);
      const kart = view.kartId !== null ? world.karts[view.kartId] : world.standings[0];
      let camera: THREE.PerspectiveCamera;
      if (view.kartId !== null && kart) {
        const chase = this.chase[i]!;
        chase.setAspect(w / h);
        chase.follow(kart, dt, this.snap.has(kart.id));
        camera = chase.camera;
      } else {
        this.show.setAspect(w / h);
        if (kart) this.show.follow(kart, time, dt);
        camera = this.show.camera;
      }
      for (const kv of this.karts.values()) kv.setViewer(view.kartId);
      this.effects?.setView(h * px, camera.fov);
      stage.follow(camera);
      this.renderer.render(stage.scene, camera);
    });
    this.snap.clear();
  }

  dispose(): void {
    for (const view of this.karts.values()) view.dispose(this.dynamic);
    this.cubes?.dispose();
    this.obstacles?.dispose();
    this.effects?.dispose();
    this.projectiles.dispose();
    this.extras.dispose();
    this.environment.dispose();
    this.stage?.scene.remove(this.dynamic);
    this.stage?.dispose();
    this.renderer.dispose();
  }
}
