import type { CharacterId } from "@/games/blade-clash/characters";
import type { PerSlot, Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/games/blade-clash/tuning";
import { Engine } from "./engine";
import type { GameEvent } from "./events";
import { TICK_MS } from "./fixed-step";
import type { SwordControl } from "./sword";

/** An engine that records everything it says, for tests. */
export function makeEngine(characters: PerSlot<CharacterId> = { 1: "knight", 2: "samurai" }, tuning: Partial<Tuning> = {}) {
  const events: GameEvent[] = [];
  const phases: MatchPhase[] = [];
  const settings = { ...DEFAULT_TUNING, ...tuning };
  const engine = new Engine(characters, () => settings, {
    onEvent: (event) => events.push(event),
    onPhase: (phase) => phases.push(phase),
  });
  return { engine, events, phases };
}

/** Runs ticks until `done` says so, or fails after `maxMs` of game time. */
export function runUntil(engine: Engine, done: () => boolean, maxMs = 10_000, each?: () => void): void {
  for (let t = 0; t < maxMs; t += TICK_MS) {
    each?.();
    engine.tick();
    if (done()) return;
  }
  throw new Error(`still waiting after ${maxMs} ms, phase ${engine.phase}`);
}

/** Starts a match and runs the countdown. */
export function toLive(engine: Engine): void {
  engine.start();
  runUntil(engine, () => engine.phase === "live", 5000);
}

/** Puts the fighters `gap` apart, either side of the middle, as if they had always stood there. */
export function standApart(engine: Engine, gap: number): void {
  for (const slot of [1, 2] as Slot[]) {
    const fighter = engine.fighters[slot];
    fighter.x = fighter.previousX = (-fighter.facing * gap) / 2;
  }
}

/** Holds a sword still at `control` until it has settled there. */
export function settle(engine: Engine, controls: Partial<PerSlot<SwordControl>>): void {
  for (let i = 0; i < 30; i++) {
    for (const slot of [1, 2] as Slot[]) {
      const control = controls[slot];
      if (control) engine.control(slot, { ...control, move: 0 });
    }
    engine.tick();
  }
}

/** Sweeps one sword from `from` to `to` over `ms`, a straight line in hold space, sending a reading every tick. */
export function swing(engine: Engine, slot: Slot, from: SwordControl, to: SwordControl, ms: number, others: Partial<PerSlot<SwordControl>> = {}): void {
  const steps = Math.max(1, Math.round(ms / TICK_MS));
  for (let i = 1; i <= steps + 12; i++) {
    const k = Math.min(1, i / steps);
    const hold = { yaw: from.yaw + (to.yaw - from.yaw) * k, pitch: from.pitch + (to.pitch - from.pitch) * k, roll: 0, reach: from.reach + (to.reach - from.reach) * k };
    engine.control(slot, { ...hold, move: 0 });
    for (const other of [1, 2] as Slot[]) {
      const control = others[other];
      if (other !== slot && control) engine.control(other, { ...control, move: 0 });
    }
    engine.tick();
  }
}

export const hold = (yaw: number, pitch: number, reach = 0): SwordControl => ({ yaw, pitch, roll: 0, reach });
