import { Vector3 } from "three";
import type { ArenaEvent, Body } from "../engine/events";
import { KINDS } from "../engine/fruit-kinds";
import { Effects } from "./effects/effects";
import { FruitViews, isRare, type FruitView } from "./fruit-views";
import { ModelLibrary } from "./models/library";
import { Pieces } from "./pieces";
import { Stage } from "./stage";
import { BladeTrails, type BladeFrame } from "./trails";

/** What the renderer draws each frame. */
export interface RenderFrame {
  bodies: readonly Body[];
  blades: readonly BladeFrame[];
}

const spark = new Vector3();
/** Frames slower than this, for long enough, step the quality down. */
const SLOW_FRAME_S = 1 / 45;
/** Seconds of slow frames before stepping down, so one hiccup never costs quality. */
const SLOW_FOR_S = 2;

/**
 * Draws the game: the board, the fruit in flight, cut halves, blades and
 * every effect. It is told what happened (a slice, a bomb) and what is
 * where each frame, and makes no game decisions of its own.
 */
export class FruitRenderer {
  private readonly stage: Stage;
  private readonly library = new ModelLibrary();
  private readonly views: FruitViews;
  private readonly pieces: Pieces;
  private readonly trails: BladeTrails;
  private readonly effects: Effects;
  private readonly camera: Vector3;
  private time = 0;
  private slowFor = 0;
  private lastFrameAt = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.stage = new Stage(canvas);
    const { scene } = this.stage;
    this.views = new FruitViews(scene, this.library);
    this.pieces = new Pieces(scene);
    this.trails = new BladeTrails(scene);
    this.effects = new Effects(scene);
    this.camera = this.stage.camera.position.clone();
  }

  get halfWidth(): number {
    return this.stage.halfWidth;
  }

  resize(width: number, height: number, dpr: number): void {
    this.stage.resize(width, height, dpr);
    this.effects.setScale(this.stage.pointScale, this.camera.z);
  }

  /** Turns a cut into halves, juice and effects. Other events leave the picture alone. */
  react(event: ArenaEvent): void {
    switch (event.type) {
      case "slice": {
        const view = this.views.take(event.body.id);
        if (view) this.split(view, event.body, event.dir, 1);
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
        const view = this.views.take(event.body.id);
        if (view) this.split(view, event.body, event.dir, 2.2);
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

  render(frame: RenderFrame, dt: number): void {
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
    this.watchFrameRate();
    this.stage.render();
  }

  dispose(): void {
    this.stage.dispose();
  }

  private split(view: FruitView, body: Body, dir: { x: number; y: number }, force: number): void {
    const a = this.library.half(body.kind, 0);
    const b = this.library.half(body.kind, 1);
    if (!a || !b) return;
    const velocity = { x: body.vx * force * 0.6, y: body.vy + (force - 1) * 2 };
    this.pieces.split([a, b], view.obj.position.clone(), view.obj.quaternion.clone(), view.scale, velocity, dir);
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

  /** A laptop that cannot keep up steps down in quality until it can, so the game stays smooth. */
  private watchFrameRate(): void {
    const now = performance.now();
    const real = this.lastFrameAt ? (now - this.lastFrameAt) / 1000 : 0;
    this.lastFrameAt = now;
    // A long gap is a hidden tab or a breakpoint, not a slow machine.
    if (real > 3) return;
    this.slowFor = real > SLOW_FRAME_S ? this.slowFor + real : Math.max(0, this.slowFor - real * 0.5);
    if (this.slowFor > SLOW_FOR_S && this.stage.lowerQuality()) this.slowFor = 0;
  }
}
