import * as THREE from "three";
import { isCharacterId, type CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { MatchDriver } from "@/games/blade-clash/host/match-driver";
import type { PerSlot } from "@/games/blade-clash/players";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import type { ShowcaseView } from "@/platform/games/game-api";
import { FLOOR } from "../render/arena/dais";
import { DuelRenderer, type View } from "../render/duel-renderer";
import { CLIP, HIGH } from "../render/quality";
import { Choreography, OPENING_HEALTH } from "./choreography";

/** The clip is eight seconds and a one second dissolve; the duel starts over after both. */
const CYCLE_MS = 9500;
/** Frames are drawn at the clip's rate, so a slow machine capturing it draws each once. */
const FRAME_MS = 1000 / 30;
/**
 * The stills stop the duel just after its first big clash: the icon while
 * the blades still touch, the poster once the flash is gone and the sparks
 * have spread with both swords thrown back.
 */
const STILL_AT_MS = { icon: 1180, poster: 1300 } as const;
/** The icon's own close camera, from the side and a little below the clash, which sits high in the frame over the title. */
const ICON_CAMERA = { from: new THREE.Vector3(0.45, -0.35, 1.9), look: new THREE.Vector3(0, -0.3, 0), fov: 42 };

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
  private icon: View | null = null;
  private still = false;
  /** Where blades last met, for the icon's camera. */
  private readonly clashAt = new THREE.Vector3(0, 1.6, 0);
  /** The page clock of the frame being drawn, for effects that keep wall time. */
  private wallNow = 0;
  private picks: PerSlot<CharacterId> = { 1: "knight", 2: "star" };
  private readonly skip: number;

  constructor(canvas: HTMLCanvasElement, view: ShowcaseView) {
    const params = new URLSearchParams(window.location.search);
    // `?pair=samurai,block` puts other fighters in the duel, for looking them over; the media keeps the default pair.
    const pair = (params.get("pair") ?? "").split(",").filter(isCharacterId);
    if (pair.length === 2) this.picks = { 1: pair[0]!, 2: pair[1]! };
    this.renderer = new DuelRenderer(canvas, { quality: view === "loop" ? CLIP : HIGH, preserve: true });
    this.renderer.setTheme(params.get("theme") !== "light");
    // `?at=` starts the loop that many milliseconds in, played through without drawing, for looking over one moment.
    this.skip = Math.max(0, Math.min(CYCLE_MS - FRAME_MS, Number(params.get("at")) || 0));
    this.begin();
    this.cycle = 0;
    if (view !== "loop") {
      // Stills play the duel forward, moving everything on but drawing nothing, then hold the moment.
      for (let wall = 0; wall <= STILL_AT_MS[view]; wall += FRAME_MS) {
        this.step(wall);
        this.renderer.update(this.driver.engine.scene(), wall);
      }
      this.still = true;
      if (view === "icon") this.icon = this.iconView();
    }
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  frame(now: number): void {
    this.wallNow = now;
    if (this.start === null) {
      this.start = now - this.skip;
      for (let wall = 0; wall < this.skip; wall += FRAME_MS) {
        this.step(wall);
        this.renderer.update(this.driver.engine.scene(), this.start + wall);
      }
    }
    if (this.still) {
      // The moment is held: only the drawing repeats, in case the window changed size.
      this.renderer.draw(this.icon ? [this.icon] : undefined);
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
    this.driver = new MatchDriver(this.picks, () => DEFAULT_TUNING, { director: null, feedback: () => undefined, onPhase: () => undefined });
    this.choreography = new Choreography();
    this.driver.listen((event: GameEvent) => {
      if (event.type === "clash") this.clashAt.set(event.at.x, event.at.y + FLOOR, event.at.z);
      this.renderer.react(event, this.wallNow);
    });
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
    this.renderer.render(this.driver.engine.scene(), now);
  }

  private iconView(): View {
    const camera = new THREE.PerspectiveCamera(ICON_CAMERA.fov, 1, 0.1, 150);
    camera.position.copy(this.clashAt).add(ICON_CAMERA.from);
    camera.lookAt(this.clashAt.clone().add(ICON_CAMERA.look));
    return { rect: { x: 0, y: 0, w: 1, h: 1 }, camera };
  }
}
