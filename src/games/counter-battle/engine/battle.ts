import { PIECES, spawnPoints, type Piece } from "./arena";
import { BotAim } from "./bot-aim";
import { updateBrain } from "./brain";
import { buildCover, nearestSpot, type CoverGraph } from "./cover";
import type { BattleEvent } from "./events";
import { createFighter, eyeOf, isBot, resetFighter, type Fighter, type FighterSetup, type TeamId } from "./fighter";
import type { GunEvent } from "./gun-state";
import { newMatch, sideOf, tickMatch, type MatchState } from "./match";
import { Rng } from "./rng";
import { coneOf, resolveShot } from "./shooting";
import { pressureAt } from "./tactics";
import { STEP } from "./tuning";
import type { V2, V3 } from "./vec";

/** A tapped shot that comes a moment early still fires once the gun is ready. */
const PULL_KEEP = 0.3;
/** A human who shot this recently is still in the fight, which holds a peek open. */
const ENGAGED_FOR = 0.5;

let sharedGraph: CoverGraph | null = null;

/** The cover graph for the field, built once: it depends only on the layout. */
export function fieldGraph(): CoverGraph {
  sharedGraph ??= buildCover(PIECES, [0, 1].flatMap((side) => [...spawnPoints(side as 0 | 1, 2), ...spawnPoints(side as 0 | 1, 1)]));
  return sharedGraph;
}

/**
 * One match: the field, the fighters, the round clock and the random
 * source. The host steps it at a fixed rate and feeds it the phones'
 * aim and trigger; everything else, movement included, happens here, so
 * the same seed and inputs always play out the same way.
 */
export class Battle {
  readonly pieces: readonly Piece[] = PIECES;
  readonly graph = fieldGraph();
  readonly fighters: Fighter[];
  readonly match: MatchState;
  readonly rng: Rng;
  time = 0;
  private readonly bots = new Map<number, BotAim>();
  private readonly engaged = new Set<number>();

  constructor(setups: readonly FighterSetup[], seed: number, options: { roundsToWin?: number } = {}) {
    this.match = newMatch(options.roundsToWin);
    this.rng = new Rng(seed);
    this.fighters = setups.map((s, i) => createFighter(i, s));
    for (const f of this.fighters) if (isBot(f)) this.bots.set(f.id, new BotAim());
    this.resetRound();
  }

  get(id: number): Fighter | undefined {
    return this.fighters[id];
  }

  /** Where a human aims, as world yaw and pitch. */
  setAim(id: number, yaw: number, pitch: number): void {
    const f = this.get(id);
    if (f) f.aim = { yaw, pitch: Math.max(-1.2, Math.min(1.2, pitch)) };
  }

  /** Aims a fighter's gun at a point in the world, from its own eye. */
  aimAt(id: number, point: V3): void {
    const f = this.get(id);
    if (!f) return;
    const eye = eyeOf(f);
    const dx = point.x - eye.x;
    const dz = point.z - eye.z;
    this.setAim(id, Math.atan2(dx, dz), Math.atan2(point.y - eye.y, Math.hypot(dx, dz)));
  }

  /**
   * Lets the computer aim and shoot for a human, as when their phone
   * drops, until it is turned off again. Movement is the same either way.
   */
  setAutopilot(id: number, on: boolean): void {
    const f = this.get(id);
    if (!f || isBot(f) || on === this.bots.has(id)) return;
    if (on) this.bots.set(id, new BotAim());
    else this.bots.delete(id);
    f.trigger = { held: false, pulls: 0, pulledAt: -Infinity };
  }

  /** The shoot button. A press always counts as one pull, and a held automatic keeps firing. */
  setTrigger(id: number, down: boolean): void {
    const f = this.get(id);
    if (!f || !f.alive) return;
    if (down && !f.trigger.held) {
      f.trigger.pulls = 1;
      f.trigger.pulledAt = this.time;
    }
    f.trigger.held = down;
  }

  reload(id: number): void {
    const f = this.get(id);
    if (f?.alive && this.match.phase === "fight") f.gun.startReload();
  }

  step(): BattleEvent[] {
    this.time += STEP;
    const events: BattleEvent[] = [];
    for (const f of this.fighters) for (const e of f.gun.update(STEP)) events.push(gunEvent(f, e));
    if (this.match.phase === "fight") this.fight(events);
    else for (const f of this.fighters) f.vel = { x: 0, z: 0 };
    const tick = tickMatch(this.match, this.fighters, STEP);
    events.push(...tick.events);
    if (tick.resetRound) this.resetRound();
    return events;
  }

  private fight(events: BattleEvent[]): void {
    const living = this.fighters.filter((f) => f.alive);
    // A fresh order every step, so nobody always shoots first when two see each other at once.
    for (let i = living.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      [living[i], living[j]] = [living[j]!, living[i]!];
    }
    const count = (t: TeamId) => living.filter((f) => f.team === t).length;
    const pressure = pressureAt(this.match.roundTime, count(0) !== count(1));
    for (const f of living) {
      if (!f.alive) continue;
      const enemies = living.filter((o) => o.team !== f.team && o.alive);
      if (enemies.length === 0) break;
      const mates = living.filter((o) => o.team === f.team && o.id !== f.id && o.alive);
      const claimed: V2[] = mates.map((o) => this.graph.spots[o.brain.spot]!.pos);
      const others = living.filter((o) => o.id !== f.id && o.alive).map((o) => o.pos);
      const bot = this.bots.get(f.id);
      const engaged = bot ? this.engaged.has(f.id) : f.trigger.held || this.time - f.shotAt < ENGAGED_FOR;
      updateBrain(f, { graph: this.graph, pieces: this.pieces, enemies, claimed, others, pressure, rng: this.rng, engaged }, this.time, STEP);
      if (bot) {
        const intent = bot.update(f, enemies, this.pieces, this.rng, this.time, STEP);
        if (intent.engaged) this.engaged.add(f.id);
        else this.engaged.delete(f.id);
        if (intent.reload) f.gun.startReload();
        if (intent.pull) this.fire(f, events);
      } else {
        this.humanTrigger(f, events);
      }
    }
  }

  private humanTrigger(f: Fighter, events: BattleEvent[]): void {
    const t = f.trigger;
    if (t.pulls > 0) {
      if (this.fire(f, events) !== "wait") t.pulls = 0;
      else if (this.time - t.pulledAt > PULL_KEEP) t.pulls = 0;
      return;
    }
    if (t.held && f.gun.spec.auto) this.fire(f, events);
  }

  private fire(f: Fighter, events: BattleEvent[]): "fired" | "dry" | "wait" {
    // The shot goes where the barrel points now; its own kick lands after.
    const aim = { yaw: f.aim.yaw + f.gun.kick.yaw, pitch: f.aim.pitch + f.gun.kick.pitch };
    const cone = coneOf(f);
    const result = f.gun.trigger(this.time, this.rng);
    if (result === "fired") events.push(...resolveShot(f, aim, cone, { pieces: this.pieces, fighters: this.fighters, rng: this.rng, now: this.time }));
    else if (result === "dry") events.push({ type: "dry", shooter: f.id });
    return result;
  }

  /** Everyone back to their end for the round now starting, sides swapped from the last. */
  private resetRound(): void {
    this.engaged.clear();
    for (const team of [0, 1] as const) {
      const side = sideOf(team, this.match.round);
      const members = this.fighters.filter((f) => f.team === team);
      const starts = spawnPoints(side, members.length);
      members.forEach((f, i) => {
        const pos = starts[i] ?? starts[0]!;
        resetFighter(f, pos, side === 0 ? 0 : Math.PI, nearestSpot(this.graph, pos, this.pieces));
      });
    }
    for (const bot of this.bots.values()) bot.reset();
  }
}

function gunEvent(f: Fighter, e: GunEvent): BattleEvent {
  if (e.type === "reload-start") return { type: "reload-start", fighter: f.id, gun: f.gun.id, seconds: e.seconds };
  if (e.type === "shell") return { type: "shell", fighter: f.id };
  return { type: "reloaded", fighter: f.id };
}
