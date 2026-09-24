import type { CharacterId } from "../characters";
import type { TrackDef } from "../tracks/types";
import { createBrain, think, type BotBrain } from "./bot";
import type { RaceEvent } from "./events";
import { fireItem, strike, tickTimers } from "./item-use";
import { createKart, NO_INPUT, type Kart, type KartInput } from "./kart";
import { buildObstacles, bumpKarts, hitObstacles, placeObstacles, type Obstacle } from "./obstacles";
import { driveKart } from "./physics";
import { buildCubes, buildPads, collectCubes, rideBoostPads, type BoostPad, type Cube } from "./pickups";
import { stepProjectile, type Projectile } from "./projectiles";
import { creditRespawn, rank, updateProgress, updateSafeSpot, updateStuck, updateWrongWay } from "./race";
import { hasFallen, respawn, respawnSpot } from "./respawn";
import { Track } from "./track";
import { EFFECTS, RACE } from "./tuning";

export type RacePhase = "countdown" | "racing" | "over";

export interface Entrant {
  character: CharacterId;
  /** The player's seat, or null for a computer kart. */
  seat: number | null;
}

/**
 * One race, from the countdown to the results. Pure simulation with no
 * drawing and no network, stepped at a fixed rate by the host, which
 * makes it easy to test and identical on every computer.
 */
export class RaceWorld {
  readonly track: Track;
  readonly karts: Kart[];
  readonly cubes: Cube[];
  readonly pads: BoostPad[];
  readonly obstacles: Obstacle[];
  projectiles: Projectile[] = [];
  phase: RacePhase = "countdown";
  /** Race clock. Negative through the countdown, zero at the start signal. A short calm comes before the 3. */
  time = -RACE.countdown - 0.6;
  /** When the race ends whoever is still out there, once someone has finished. */
  deadline: number | null = null;
  standings: Kart[];
  private readonly inputs = new Map<number, KartInput>();
  private readonly brains = new Map<number, BotBrain>();
  private readonly pedalSince = new Map<number, number>();
  private events: RaceEvent[] = [];
  private nextProjectile = 1;

  constructor(def: TrackDef, entrants: readonly Entrant[], private readonly random: () => number = Math.random) {
    this.track = new Track(def);
    // Two by two behind the line, the first entrant on pole.
    this.karts = entrants.map((e, i) =>
      createKart(i, e.character, e.seat, this.track, this.track.wrap(-7 - Math.floor(i / 2) * 7.5 - (i % 2) * 2), (i % 2 ? 1 : -1) * this.track.halfWidth * 0.42),
    );
    for (const kart of this.karts) this.brains.set(kart.id, createBrain(random));
    this.cubes = buildCubes(this.track);
    this.pads = buildPads(this.track);
    this.obstacles = buildObstacles(this.track);
    this.standings = rank(this.karts);
  }

  setInput(kartId: number, input: KartInput): void {
    this.inputs.set(kartId, input);
  }

  /** A player's phone dropped (the computer takes the wheel) or came back. */
  setAutopilot(kartId: number, on: boolean): void {
    const kart = this.karts[kartId];
    if (kart && kart.seat !== null) kart.autopilot = on;
  }

  useItem(kartId: number): void {
    const kart = this.karts[kartId];
    if (!kart || this.phase === "countdown") return;
    const thrown = fireItem(kart, this.karts, this.track, this.nextProjectile, this.time, this.emit);
    if (thrown) {
      this.nextProjectile += 1;
      this.projectiles.push(thrown);
    }
  }

  drainEvents(): RaceEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private readonly emit = (event: RaceEvent) => {
    this.events.push(event);
  };

  step(dt: number): void {
    const before = this.time;
    this.time += dt;
    if (this.phase === "countdown") return this.countdown(before);
    placeObstacles(this.obstacles, this.track, this.time);
    this.biasComputers();
    for (const kart of this.karts) this.stepKart(kart, dt);
    bumpKarts(this.karts, this.emit);
    collectCubes(this.cubes, this.karts, this.time, this.random, this.emit);
    for (const p of this.projectiles) {
      const struck = stepProjectile(p, this.karts, this.track, dt);
      if (struck) strike(struck, p.kind, p.owner, this.emit);
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.standings = rank(this.karts);
    this.checkOver();
  }

  private countdown(before: number): void {
    for (const kart of this.karts) {
      const pressing = this.inputs.get(kart.id)?.throttle ?? false;
      if (!pressing) this.pedalSince.delete(kart.id);
      else if (!this.pedalSince.has(kart.id)) this.pedalSince.set(kart.id, before);
    }
    for (let count = RACE.countdown; count >= 1; count--) {
      if (before < -count && this.time >= -count) this.emit({ type: "countdown", count });
    }
    if (this.time < 0) return;
    this.phase = "racing";
    this.emit({ type: "go" });
    // Pressing Drive in the last second before the start pays off; holding it all along does not.
    for (const kart of this.karts) {
      const since = this.pedalSince.get(kart.id);
      const good = kart.autopilot ? this.random() < 0.4 : since !== undefined && since > -1.1;
      if (!good) continue;
      kart.timers.boost = EFFECTS.startBoost;
      this.emit({ type: "boost", kart: kart.id, source: "start" });
    }
  }

  private stepKart(kart: Kart, dt: number): void {
    tickTimers(kart, dt);
    let input = this.inputs.get(kart.id) ?? NO_INPUT;
    // Once over the line, or once the race is over, the computer drives the lap of honour.
    if (kart.autopilot || kart.race.finished || this.phase === "over") {
      const chased = this.projectiles.some((p) => p.target === kart.id);
      const view = { track: this.track, karts: this.karts, cubes: this.cubes, obstacles: this.obstacles, chased };
      const plan = think(kart, this.brains.get(kart.id)!, view, this.time, dt, this.random);
      input = plan.input;
      if (plan.use && !kart.race.finished) this.useItem(kart.id);
    }
    driveKart(kart, input, this.track, dt, this.emit);
    rideBoostPads(this.pads, kart, this.track, this.emit);
    hitObstacles(kart, this.obstacles, this.emit, (k) => strike(k, "obstacle", null, this.emit));
    const finishedSoFar = this.karts.filter((k) => k.race.finished).length;
    // After the race is called, places are fixed: nobody can still cross the line.
    const status = this.phase === "over" ? "ok" : updateProgress(kart, this.track, this.time, finishedSoFar, this.emit);
    updateWrongWay(kart, this.track, dt);
    updateSafeSpot(kart, this.track);
    const trying = kart.autopilot || input.throttle || input.brake;
    if (status === "lost") this.putBack(kart, { s: this.track.wrap(kart.race.lastCheckpointS + 4), d: 0 });
    else if (hasFallen(kart, this.track)) {
      this.emit({ type: "fell", kart: kart.id });
      this.putBack(kart, respawnSpot(kart, this.track));
    } else if (updateStuck(kart, trying, dt)) this.putBack(kart, { s: kart.race.safeS, d: 0 });
  }

  private putBack(kart: Kart, spot: { s: number; d: number }): void {
    respawn(kart, this.track, spot);
    creditRespawn(kart, this.track, this.time, this.karts.filter((k) => k.race.finished).length, this.emit);
    this.emit({ type: "respawn", kart: kart.id });
  }

  /**
   * Computer karts ease off when far ahead of the best player and push a
   * little when far behind, so a solo race stays a race.
   */
  private biasComputers(): void {
    const humans = this.karts.filter((k) => k.seat !== null);
    if (humans.length === 0) return;
    const best = Math.max(...humans.map((k) => k.race.progress));
    for (const kart of this.karts) {
      if (kart.seat !== null) continue;
      const gap = best - kart.race.progress;
      kart.speedBias = (0.96 + (kart.id % 3) * 0.015) * (1 + Math.max(-0.1, Math.min(0.12, gap / 300)));
    }
  }

  /**
   * The race ends when every kart is home, or a while after the first one
   * finishes. Once every player is home the computers get only a short
   * while longer, so nobody waits on them.
   */
  private checkOver(): void {
    if (this.phase !== "racing") return;
    if (this.deadline === null && this.karts.some((k) => k.race.finished)) this.deadline = this.time + RACE.finishGrace;
    const humans = this.karts.filter((k) => k.seat !== null);
    if (humans.length > 0 && humans.every((k) => k.race.finished)) this.deadline = Math.min(this.deadline ?? Infinity, this.time + RACE.computerGrace);
    const allHome = this.karts.every((k) => k.race.finished);
    if (allHome || (this.deadline !== null && this.time >= this.deadline)) {
      this.phase = "over";
      this.emit({ type: "raceOver" });
    }
  }
}
