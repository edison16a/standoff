import { Quaternion, Vector3 } from "three";
import type { ArenaEvent, Body } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import { Effects } from "./effects/effects";
import { FruitViews, isRare, type FruitView } from "./fruit-views";
import { sharedLibrary } from "./models/library";
import { Pieces } from "./pieces";
import { QualityWatch } from "./quality-watch";
import { Stage } from "./stage";
import { BladeTrails, type BladeFrame } from "./trails";

/** What the renderer draws each frame. */
export interface RenderFrame {
  bodies: readonly Body[];
  blades: readonly BladeFrame[];
}

const spark = new Vector3();

export interface RendererOptions {
  /**
   * Whether a slow machine steps the quality down. The showcase turns it
   * off: its clock is stepped by hand, so real frame times mean nothing.
   */
  adaptive?: boolean;
}

/**
 * Draws the game: the board, the fruit in flight, cut halves, blades and
 * every effect. It is told what happened (a slice, a bomb) and what is
 * where each frame, and makes no game decisions of its own.
 */
export class FruitRenderer {
  private readonly stage: Stage;
  private readonly library = sharedLibrary();
  private readonly views: FruitViews;
  private readonly pieces: Pieces;
  private readonly trails: BladeTrails;
  private readonly effects: Effects;
  /** Where the camera rests, before any shake. */
  private readonly camera: Vector3;
  private readonly home: Vector3;
  private readonly quality: QualityWatch | null;
  private time = 0;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.stage = new Stage(canvas);
    this.quality = options.adaptive === false ? null : new QualityWatch(this.stage);
    const { scene } = this.stage;
    this.views = new FruitViews(scene, this.library);
    this.pieces = new Pieces(scene);
    this.trails = new BladeTrails(scene);
    this.effects = new Effects(scene);
    this.camera = this.stage.camera.position.clone();
    this.home = this.camera.clone();
  }

  get halfWidth(): number {
    return this.stage.halfWidth;
  }

  resize(width: number, height: number, dpr: number): void {
    this.stage.resize(width, height, dpr);
  }

  /** Turns a cut into halves, juice and effects. Other events leave the picture alone. */
  react(event: ArenaEvent): void {
    switch (event.type) {
      case "slice": {
        this.split(this.views.take(event.body.id), event.body, event.dir, 1);
        const { juice } = this.library.get(event.body.kind);
        this.effects.slice(event.body.x, event.body.y, event.dir, juice, event.body.radius);
        if (isRare(event.body.kind)) this.effects.treasure(event.body.x, event.body.y, event.body.kind === "dragonfruit");
        return;
      }
      case "hit":
        this.views.hit(event.body.id);
        this.effects.hit(event.at.x, event.at.y, event.dir, this.library.get(event.body.kind).juice);
        return;
      case "burst": {
        this.split(this.views.take(event.body.id), event.body, event.dir, 2.2);
        this.effects.burst(event.body.x, event.body.y, this.library.get(event.body.kind).juice, event.body.radius);
        return;
      }
      case "bomb":
        this.views.take(event.body.id);
        this.effects.bomb(event.body.x, event.body.y);
        return;
    }
  }

  /** Confetti in the winners' colours. */
  celebrate(colors: string[]): void {
    this.effects.confetti.launch(this.stage.halfWidth, colors);
  }

  calm(): void {
    this.effects.confetti.stop();
  }

  /** Clears everything in flight, for a fresh round. */
  reset(): void {
    this.views.clear();
    this.pieces.clear();
    this.effects.clear();
  }

  /**
   * Moves everything on by dt and draws it. With `draw` false it only
   * moves, for the showcase's fast forward to the moment it films.
   */
  render(frame: RenderFrame, dt: number, draw = true): void {
    this.time += dt;
    this.library.warm();
    this.views.sync(frame.bodies, dt, this.time);
    for (const view of this.views.all) this.decorate(view);
    const speeds = this.trails.update(frame.blades, this.time);
    for (const blade of frame.blades) {
      const speed = speeds.get(blade.seat) ?? 0;
      if (speed > 9 && !blade.stunned) this.effects.trail(blade.x, blade.y, blade.blade, speed);
    }
    this.pieces.update(dt);
    this.effects.update(dt, this.time);
    this.shakeCamera();
    if (!draw) return;
    this.quality?.frame(this.time);
    this.stage.render();
  }

  /** Draws the same picture again, for a still whose canvas was resized. */
  redraw(): void {
    this.stage.render();
  }

  /**
   * Moves the camera in toward a point, for the showcase's close shots.
   * A zoom of 1 is the game's own view of the whole board.
   */
  aim(x: number, y: number, zoom: number): void {
    this.camera.set(this.home.x + x, this.home.y + y, this.home.z / zoom);
  }

  dispose(): void {
    this.views.clear();
    this.pieces.clear();
    this.trails.dispose();
    this.effects.dispose();
    this.stage.dispose();
  }

  /**
   * Swaps a cut fruit for its two halves. A fruit cut in the very frame it
   * appeared has no view yet, so its halves start from where the engine
   * says it is.
   */
  private split(view: FruitView | null, body: Body, dir: { x: number; y: number }, force: number): void {
    const a = this.library.half(body.kind, 0);
    const b = this.library.half(body.kind, 1);
    if (!a || !b) return;
    const velocity = { x: body.vx * force * 0.6, y: body.vy + (force - 1) * 2 };
    const at = view ? view.obj.position.clone() : new Vector3(body.x, body.y, 0);
    const turn = view ? view.obj.quaternion.clone() : new Quaternion();
    this.pieces.split([a, b], at, turn, this.library.get(body.kind).scale, velocity, dir);
  }

  /** Per frame touches on a flying body: glitter around rare fruit, fizz at a bomb's fuse. */
  private decorate(view: FruitView): void {
    if (isRare(view.kind)) {
      const p = view.obj.position;
      this.effects.aura(p.x, p.y, KINDS[view.kind].radius, view.kind === "dragonfruit", this.time);
    }
    const tip = view.sparks[0];
    if (tip && Math.random() < 0.7) {
      tip.getWorldPosition(spark);
      this.effects.fuse(spark.x, spark.y, spark.z);
    }
  }

  private shakeCamera(): void {
    const s = this.effects.shake;
    const cam = this.stage.camera.position;
    cam.set(this.camera.x + (Math.random() - 0.5) * s, this.camera.y + (Math.random() - 0.5) * s, this.camera.z);
  }
}
