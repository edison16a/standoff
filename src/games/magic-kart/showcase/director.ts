import { CHARACTER_IDS, CHARACTERS } from "../characters";
import { seeded } from "../engine/random";
import { STEP } from "../engine/tuning";
import { RaceWorld } from "../engine/world";
import { GameRenderer } from "../render/game-renderer";
import { findTrack } from "../tracks";
import { keepPackTogether } from "./pack";
import { ShotCamera } from "./shot-camera";
import { shotAt, type Plan, type Shot } from "./shots";

/** More steps than this in one frame is a jump in time, whose events would all burst at once. */
const CATCH_UP = 6;
/**
 * The showcase clock ticks this many times a second, as animation frames
 * do. The capture tool's fake clock fires animation frames on a 16 ms
 * grid and records every 33.3 ms, so a 30 a second clock would now and
 * then show the same moment twice. At 60 every recorded frame is new.
 */
const FPS = 60;

/**
 * Plays a showcase plan: builds each shot's seeded race, runs it on to
 * where the shot begins, then steps it with the showcase clock and
 * frames it with the shot's camera. Time within a shot is worked out
 * from the clock alone, so a given moment always looks the same, which
 * is what lets the capture tool step it frame by frame and the loop
 * join up.
 */
export class ShowcaseDirector {
  private readonly renderer: GameRenderer;
  private readonly rig = new ShotCamera();
  private shot: Shot | null = null;
  private world: RaceWorld | null = null;
  private steps = 0;
  private start: number | null = null;
  /** A moment the showcase is held on while shots are being tuned, instead of the clock. */
  private pinned: number | null = null;
  /** The moment of the plan last drawn, so a tuning script knows its frame is up. */
  shown = -1;
  /** The shot time last drawn, so a still that has stopped is not drawn again and again. */
  private drawn = -1;
  private readonly random = Math.random;

  constructor(canvas: HTMLCanvasElement, private readonly plan: Plan) {
    this.renderer = new GameRenderer(canvas);
    this.renderer.tags = false;
    this.renderer.adaptive = false;
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
    this.drawn = -1;
  }

  frame(nowMs: number): void {
    this.start ??= nowMs;
    const elapsed = this.pinned ?? Math.floor(((nowMs - this.start) / 1000) * FPS + 1e-6) / FPS;
    const { shot, time } = shotAt(this.plan, elapsed);
    const target = Math.round(time / STEP);
    // A new shot, or the same one come round again in a loop of one.
    if (shot !== this.shot || target < this.steps) this.begin(shot);
    const world = this.world!;
    const burst = target - this.steps <= CATCH_UP;
    for (; this.steps < target; this.steps++) {
      keepPackTogether(world);
      world.step(STEP);
      for (const event of world.drainEvents()) if (burst) this.renderer.onEvent(event);
    }
    if (time === this.drawn) return;
    const dt = this.drawn < 0 ? 0 : time - this.drawn;
    this.drawn = time;
    this.rig.aim(world, shot.rig, dt, time);
    this.renderer.render([{ kartId: null, rect: { x: 0, y: 0, w: 1, h: 1 }, camera: this.rig.camera }], (shot.from + time) * 1000);
    // The capture tool steps its fake clock as fast as the page allows. Without waiting for each
    // frame to be drawn, a machine with no graphics card falls minutes behind and screenshots time out.
    this.renderer.finish();
    this.shown = elapsed;
  }

  /** Holds the showcase on one moment of its plan, for tuning shots, or lets the clock run it again. */
  pin(seconds: number | null): void {
    this.pinned = seconds;
  }

  dispose(): void {
    Math.random = this.random;
    this.renderer.dispose();
  }

  /**
   * Builds a shot's race and runs it on to where the shot begins. The
   * particles, the flame flicker and the camera shake draw on
   * Math.random, which the capture tool's fake clock leaves alone, so it
   * is seeded afresh at every cut and each pass of the loop matches the
   * last.
   */
  private begin(shot: Shot): void {
    const world = new RaceWorld(findTrack(shot.map), CHARACTER_IDS.map((character) => ({ character, seat: null })), seeded(shot.seed));
    while (world.time < shot.from) {
      keepPackTogether(world);
      world.step(STEP);
    }
    world.drainEvents();
    Math.random = seeded(shot.seed * 7919 + 1);
    this.renderer.setWorld(world, (id) => {
      const character = CHARACTERS[world.karts[id]!.character];
      return { name: character.name, color: character.color };
    });
    this.rig.cut();
    this.shot = shot;
    this.world = world;
    this.steps = 0;
    this.drawn = -1;
  }
}
