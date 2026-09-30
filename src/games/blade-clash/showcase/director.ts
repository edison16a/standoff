import * as THREE from "three";
import { isCharacterId, type CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { MatchDriver } from "@/games/blade-clash/host/match-driver";
import type { PerSlot } from "@/games/blade-clash/players";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import type { ShowcaseView } from "@/platform/games/game-api";
import { DuelRenderer } from "../render/duel-renderer";
import { CLIP, HIGH } from "../render/quality";
import { FULL } from "../render/split";
import { Choreography, OPENING_SCORE } from "./choreography";
import { iconCamera, posterCamera, trailerCamera, type Stage } from "./cinema";
import { CYCLE_S, duelAt } from "./edit";

/** Frames are drawn at the clip's rate, so a slow machine capturing it draws each once. */
const FRAME_MS = 1000 / 30;
/**
 * The duel moves on in steps of 1/60 s: a frame drawn 32 or 48 ms after
 * the last, as the capture tool's clock falls, always shows a new moment.
 */
const STEPS_PER_S = 60;
const STEP_MS = 1000 / STEPS_PER_S;
/**
 * The stills stop the duel here, in milliseconds: the icon as the blades
 * first meet, the poster a beat later with the sparks spread wide.
 */
const STILL_AT_MS = { icon: 1180, poster: 1250 } as const;

/**
 * Runs the showcase: the scripted duel between the Knight and the Star
 * Knight through the real match driver, so the slow motion and effects
 * are the game's own, filmed like a trailer. The duel keeps its own
 * clock, which the edit jumps forward over the slow parts; every step is
 * still played, so nothing is skipped in the engine.
 */
export class ShowcaseDirector {
  private readonly renderer: DuelRenderer;
  private readonly camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 150);
  private driver!: MatchDriver;
  private choreography!: Choreography;
  private fightAt = 0;
  private start: number | null = null;
  private last = -Infinity;
  /** Milliseconds of the duel played so far, the clock everything in it runs on. */
  private duelMs = 0;
  private lastT = -1;
  private still: THREE.PerspectiveCamera | null = null;
  private picks: PerSlot<CharacterId> = { 1: "knight", 2: "star" };
  /** Stays on the winner's ceremony after the duel rather than starting over, from `?ceremony`. */
  private readonly stay: boolean;
  private readonly skip: number;

  /** `onWon` hears the duel won, for the ceremony's names over the page. */
  constructor(canvas: HTMLCanvasElement, view: ShowcaseView, private readonly onWon: (winner: 1 | 2) => void = () => undefined) {
    const params = new URLSearchParams(window.location.search);
    // `?pair=samurai,block` puts other fighters in the duel, for looking them over; the media keeps the default pair.
    const pair = (params.get("pair") ?? "").split(",").filter(isCharacterId);
    if (pair.length === 2) this.picks = { 1: pair[0]!, 2: pair[1]! };
    this.renderer = new DuelRenderer(canvas, { quality: view === "loop" ? CLIP : HIGH, preserve: true });
    this.renderer.setTheme(params.get("theme") !== "light");
    this.stay = params.has("ceremony");
    // `?at=` starts the trailer that many milliseconds in, for looking over one moment.
    this.skip = Math.max(0, Math.min(CYCLE_S * 1000 - FRAME_MS, Number(params.get("at")) || 0));
    this.begin();
    if (view !== "loop") {
      // Stills play the duel forward, moving everything on but drawing nothing, then hold the moment.
      this.playTo(STILL_AT_MS[view]);
      const place = view === "icon" ? iconCamera : posterCamera;
      this.still = place(this.camera, this.stage());
    }
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  frame(now: number): void {
    if (this.still) {
      // The moment is held: only the drawing repeats, in case the window changed size.
      this.renderer.draw([{ rect: FULL, camera: this.still }]);
      return;
    }
    if (now - this.last < FRAME_MS * 0.9) return;
    this.last = now;
    // `?ceremony` runs the duel on to its end and stays there; the trailer loops its edit.
    this.start ??= now - this.skip;
    // Whole steps, counted as integers, so every pass through the loop cuts on exactly the same frames.
    const steps = Math.floor(((now - this.start) * STEPS_PER_S) / 1000 + 1e-6);
    const t = (this.stay ? steps : steps % (CYCLE_S * STEPS_PER_S)) / STEPS_PER_S;
    if (t < this.lastT) this.begin();
    this.lastT = t;
    this.playTo(this.stay ? t * 1000 : duelAt(t) * 1000);
    // `?ceremony` draws what the game would: the split screen, then the ceremony's own camera.
    this.renderer.draw(this.stay ? undefined : [{ rect: FULL, camera: trailerCamera(this.camera, this.stage(), t) }]);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  /** A fresh duel, its countdown already run, the fight starting now. */
  private begin(): void {
    this.driver = new MatchDriver(this.picks, () => DEFAULT_TUNING, { director: null, feedback: () => undefined, onPhase: () => undefined });
    this.choreography = new Choreography();
    this.driver.listen((event: GameEvent) => {
      if (event.type === "matchWon" && this.stay) this.onWon(event.winner);
      this.renderer.react(event, this.duelMs);
    });
    this.driver.start();
    const { engine } = this.driver;
    engine.match.score = { ...OPENING_SCORE };
    this.renderer.reset();
    for (let t = -3200; t <= 0; t += FRAME_MS) this.driver.tick(t);
    this.fightAt = engine.now;
    this.duelMs = 0;
  }

  /**
   * Plays the duel on to `ms`, a step at a time. The renderer follows
   * every step, so its effects and cameras run on the duel's clock even
   * across a cut that jumps it forward.
   */
  private playTo(ms: number): void {
    // The first step is at 0, as in the test beside the edit: the duel's blows land where they do only on this exact clock.
    while (this.duelMs <= ms + 0.5) {
      this.choreography.drive(this.driver.engine, this.driver.engine.now - this.fightAt);
      this.driver.tick(this.duelMs);
      this.renderer.update(this.driver.engine.scene(), this.duelMs);
      this.duelMs += STEP_MS;
    }
  }

  private stage(): Stage {
    const fighters = this.driver.engine.scene().fighters;
    const x = (slot: 1 | 2) => fighters.find((f) => f.slot === slot)!.x;
    return { x1: x(1), x2: x(2), shoulder: this.renderer.cameras[1].camera };
  }
}
