import type { CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { TICK_MS } from "@/games/blade-clash/engine/fixed-step";
import type { StageFrame } from "@/games/blade-clash/engine/frames";
import { EN_GARDE_SECONDS } from "@/games/blade-clash/engine/rules";
import { MatchDriver } from "@/games/blade-clash/host/match-driver";
import { SLOTS } from "@/games/blade-clash/players";
import { DEFAULT_TUNING } from "@/games/blade-clash/tuning";
import { aim, moveAt, STRIKES } from "./choreography";

/** Wall clock the driver spends on the countdown before the showcase starts watching. */
const LEAD_IN_MS = EN_GARDE_SECONDS * 1000 + 100;

/**
 * One run of the showcase bout. It plays the choreography into a real
 * match driver, slow motion and all, and reports the events so the
 * renderer can react. It is pure logic, so tests can play it too.
 */
export class ShowcaseBout {
  readonly driver: MatchDriver;
  private allezAt: number | null = null;
  private struck = new Set<number>();
  private wall = 0;

  constructor(characters: { 1: CharacterId; 2: CharacterId }, onEvent: (event: GameEvent) => void) {
    this.driver = new MatchDriver(characters, () => DEFAULT_TUNING, {
      director: null,
      feedback: () => undefined,
      recenter: () => undefined,
      onPhase: () => undefined,
    });
    this.driver.listen((event) => {
      if (event.type === "allez") this.allezAt = this.driver.engine.now;
      onEvent(event);
    });
    this.driver.start();
    // Run the countdown out of sight, so the showcase opens on "allez".
    for (let wall = 0; wall <= LEAD_IN_MS; wall += TICK_MS) this.driver.tick(wall);
    this.wall = LEAD_IN_MS;
  }

  /** Game milliseconds since "allez". */
  get time(): number {
    return this.allezAt === null ? 0 : this.driver.engine.now - this.allezAt;
  }

  /** Moves the bout on by `dtMs` of wall clock. */
  step(dtMs: number): void {
    const t = this.time;
    const engine = this.driver.engine;
    for (const slot of SLOTS) engine.control(slot, { ...aim(slot, t), move: moveAt(slot, t) });
    STRIKES.forEach((cue, i) => {
      if (t >= cue.at && !this.struck.has(i)) {
        this.struck.add(i);
        engine.strike(cue.slot, cue.action);
      }
    });
    this.wall += dtMs;
    this.driver.tick(this.wall);
  }

  scene(): StageFrame {
    return this.driver.engine.scene();
  }

  get scores(): [number, number] {
    const { scores } = this.driver.engine.match;
    return [scores[1], scores[2]];
  }
}
