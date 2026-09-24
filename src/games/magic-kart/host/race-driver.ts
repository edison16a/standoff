import type { RaceEvent } from "../engine/events";
import { FixedStepClock } from "../engine/fixed-step";
import type { KartInput } from "../engine/kart";
import { STEP } from "../engine/tuning";
import { RaceWorld, type Entrant } from "../engine/world";
import type { InputMessage } from "../protocol";
import type { TrackDef } from "../tracks/types";

/** A phone that has sent nothing for this long has its pedals let go. */
const STALE_MS = 1200;

/**
 * Runs one race on the host: steps the world at a fixed rate, feeds it
 * the phones' input and hands every race event on to whoever listens
 * (the sound, the effects and the phones' buzzers).
 */
export class RaceDriver {
  readonly world: RaceWorld;
  /** Which kart each player's seat drives. */
  readonly kartBySeat = new Map<number, number>();
  private readonly clock = new FixedStepClock();
  private readonly lastInput = new Map<number, number>();
  private readonly listeners = new Set<(event: RaceEvent) => void>();

  constructor(
    readonly def: TrackDef,
    entrants: readonly Entrant[],
    random: () => number = Math.random,
  ) {
    this.world = new RaceWorld(def, entrants, random);
    entrants.forEach((entrant, kartId) => {
      if (entrant.seat !== null) this.kartBySeat.set(entrant.seat, kartId);
    });
  }

  listen(listener: (event: RaceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  tick(nowMs: number): void {
    for (const [seat, at] of this.lastInput) {
      if (nowMs - at > STALE_MS) this.setInput(seat, { steer: 0, throttle: false, brake: false }, null);
    }
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps; i++) {
      this.world.step(STEP);
      for (const event of this.world.drainEvents()) for (const listener of this.listeners) listener(event);
    }
  }

  input(seat: number, message: InputMessage, nowMs: number): void {
    this.setInput(seat, { steer: message.steer, throttle: message.drive, brake: message.brake }, nowMs);
  }

  use(seat: number): void {
    const kart = this.kartBySeat.get(seat);
    if (kart !== undefined) this.world.useItem(kart);
  }

  /** A player's phone dropped or came back. The computer drives while it is away. */
  setOnline(seat: number, online: boolean): void {
    const kart = this.kartBySeat.get(seat);
    if (kart === undefined) return;
    this.world.setAutopilot(kart, !online);
    if (!online) this.setInput(seat, { steer: 0, throttle: false, brake: false }, null);
  }

  private setInput(seat: number, input: KartInput, nowMs: number | null): void {
    const kart = this.kartBySeat.get(seat);
    if (kart === undefined) return;
    this.world.setInput(kart, input);
    if (nowMs === null) this.lastInput.delete(seat);
    else this.lastInput.set(seat, nowMs);
  }
}
