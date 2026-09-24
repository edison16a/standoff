import type { RunEvent } from "../engine/events";
import { POWER_NAMES } from "../engine/powers";
import { Run } from "../engine/run";
import { Tutorial } from "../engine/tutorial";
import type { Intent } from "./controls";
import type { RunnerHud } from "./store";

/** Seconds a crash plays out before that player's run counts as over. */
export const CRASH_HOLD_S = 2.4;
/** Seconds of "get ready" after a player who stepped away comes back. */
export const RESUME_S = 2;

interface Seat {
  run: Run;
  away: boolean;
  /** Seconds until an away player's run goes on again, once they are back. */
  resume: number | null;
  banner: { text: string; id: number } | null;
  bannerUntil: number;
  tutorial: Tutorial;
}

/**
 * One round of runs, one per player on the same seed, so both face the
 * same yard. Each run pauses on its own when its player steps out of
 * view, and the round is over once every runner has crashed.
 */
export class Round {
  readonly seats: Seat[];
  private time = 0;
  private bannerId = 0;
  private readonly listeners = new Set<(slot: number, event: RunEvent) => void>();

  constructor(
    players: number,
    readonly seed: number,
    readonly practice = false,
  ) {
    this.seats = Array.from({ length: players }, () => ({
      run: new Run(seed, { practice }),
      away: false,
      resume: null,
      banner: null,
      bannerUntil: 0,
      tutorial: new Tutorial(),
    }));
  }

  get runs(): Run[] {
    return this.seats.map((seat) => seat.run);
  }

  listen(listener: (slot: number, event: RunEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Whether the run for `slot` is held still, waiting for its player. */
  paused(slot: number): boolean {
    const seat = this.seats[slot - 1];
    return !!seat && (seat.away || seat.resume !== null);
  }

  setAway(slot: number, away: boolean): void {
    const seat = this.seats[slot - 1];
    if (!seat || seat.run.crashed) return;
    if (away) {
      seat.away = true;
      seat.resume = null;
    } else if (seat.away) {
      seat.away = false;
      seat.resume = RESUME_S;
    }
  }

  get over(): boolean {
    return this.seats.every((seat) => seat.run.crashed && seat.run.time - seat.run.crashed.time > CRASH_HOLD_S);
  }

  update(dt: number, intents: readonly Intent[]): void {
    this.time += dt;
    this.seats.forEach((seat, i) => {
      if (seat.away) return;
      if (seat.resume !== null) {
        seat.resume -= dt;
        if (seat.resume > 0) return;
        seat.resume = null;
      }
      const intent = intents[i];
      if (intent) seat.run.input(intent.lane, intent);
      seat.run.update(dt);
      for (const event of seat.run.drain()) this.onEvent(i + 1, seat, event);
    });
  }

  private onEvent(slot: number, seat: Seat, event: RunEvent): void {
    const shout = bannerFor(event);
    if (shout) {
      seat.banner = { text: shout, id: ++this.bannerId };
      seat.bannerUntil = this.time + 1.6;
    }
    for (const listener of this.listeners) listener(slot, event);
  }

  hud(names: readonly string[]): RunnerHud[] {
    return this.seats.map((seat, i) => {
      const run = seat.run;
      return {
        slot: i + 1,
        name: names[i] ?? `Player ${i + 1}`,
        score: Math.floor(run.score),
        coins: run.coins,
        multiplier: run.multiplier,
        distance: Math.floor(run.runner.distance),
        powers: run.powers.active().map((kind) => ({ kind, share: run.powers.share(kind) })),
        away: seat.away,
        resume: seat.resume === null ? null : Math.ceil(seat.resume),
        crashed: run.crashed?.cause ?? null,
        banner: this.time < seat.bannerUntil ? seat.banner : null,
        tutorial: seat.tutorial.done,
      };
    });
  }
}

function bannerFor(event: RunEvent): string | null {
  switch (event.type) {
    case "power":
      return POWER_NAMES[event.kind];
    case "saved":
      return "Saved by the board!";
    case "level":
      return `Score x${event.multiplier}`;
    default:
      return null;
  }
}
