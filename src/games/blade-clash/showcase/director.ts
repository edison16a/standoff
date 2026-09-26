import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { MatchDriver } from "@/games/blade-clash/host/match-driver";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import type { ShowcaseView } from "@/platform/games/game-api";
import { DuelRenderer, type View } from "../render/duel-renderer";
import { CLIP, HIGH } from "../render/quality";
import { Choreography, OPENING_HEALTH } from "./choreography";

/** The clip is eight seconds and a one second dissolve; the duel starts over after both. */
const CYCLE_MS = 9500;
/** Frames are drawn at the clip's rate, so a slow machine capturing it draws each once. */
const FRAME_MS = 1000 / 30;
/** The stills stop the duel just after its first big clash, sparks in the air. */
const STILL_AT_MS = 1400;
/** The icon's own close camera on that clash. */
const ICON_CAMERA = { eye: new THREE.Vector3(0.1, 2.05, 2.3), look: new THREE.Vector3(-0.05, 1.75, 0), fov: 34 };

/**
 * Runs the showcase: the scripted duel between the Knight and the Star
 * Knight through the real match driver, so the slow motion finish is the
 * game's own. The loop and the poster are the split screen as players
 * see it; the icon is a close shot of the first clash.
 */
export class ShowcaseDirector {
  private readonly renderer: DuelRenderer;
  private driver!: MatchDriver;
  private choreography!: Choreography;
  private fightAt = 0;
  private start: number | null = null;
  private last = -Infinity;
  private cycle = -1;
  private readonly icon: View | null;
  private still = false;
  /** The page clock of the frame being drawn, for effects that keep wall time. */
  private wallNow = 0;

  constructor(canvas: HTMLCanvasElement, view: ShowcaseView) {
    this.renderer = new DuelRenderer(canvas, { quality: view === "loop" ? CLIP : HIGH, preserve: true });
    this.renderer.setTheme(new URLSearchParams(window.location.search).get("theme") !== "light");
    this.icon = view === "icon" ? this.iconView() : null;
    this.begin();
    if (view !== "loop") {
      // Stills play the duel forward without drawing, then hold the moment.
      for (let wall = 0; wall <= STILL_AT_MS; wall += FRAME_MS) this.step(wall);
      this.still = true;
    }
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  frame(now: number): void {
    this.start ??= now;
    this.wallNow = now;
    if (this.still) {
      this.draw(now);
      return;
    }
    if (now - this.last < FRAME_MS * 0.9) return;
    this.last = now;
    const wall = now - this.start;
    const cycle = Math.floor(wall / CYCLE_MS);
    if (cycle !== this.cycle) {
      this.cycle = cycle;
      this.begin();
    }
    this.step(wall - cycle * CYCLE_MS);
    this.draw(now);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  /** A fresh duel, its countdown already run, the fight starting now. */
  private begin(): void {
    this.driver = new MatchDriver({ 1: "knight", 2: "star" }, () => DEFAULT_TUNING, { director: null, feedback: () => undefined, onPhase: () => undefined });
    this.choreography = new Choreography();
    this.driver.listen((event: GameEvent) => this.renderer.react(event, this.wallNow));
    this.driver.start();
    const { engine } = this.driver;
    engine.match.health = { ...OPENING_HEALTH };
    for (const slot of [1, 2] as const) engine.fighters[slot].health = OPENING_HEALTH[slot];
    this.renderer.reset();
    for (let t = -3200; t <= 0; t += FRAME_MS) this.driver.tick(t);
    this.fightAt = engine.now;
  }

  private step(wall: number): void {
    this.choreography.drive(this.driver.engine, this.driver.engine.now - this.fightAt);
    this.driver.tick(wall);
  }

  private draw(now: number): void {
    this.renderer.render(this.driver.engine.scene(), now, this.icon ? [this.icon] : undefined);
  }

  private iconView(): View {
    const camera = new THREE.PerspectiveCamera(ICON_CAMERA.fov, 1, 0.1, 150);
    camera.position.copy(ICON_CAMERA.eye);
    camera.lookAt(ICON_CAMERA.look);
    return { rect: { x: 0, y: 0, w: 1, h: 1 }, camera };
  }
}
