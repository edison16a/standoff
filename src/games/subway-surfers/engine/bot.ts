import { touchesCoin } from "./collect";
import { Hands, type Action } from "./hands";
import { JETPACK_HEIGHT } from "./powers";
import { stepRunner, type Abilities, type RunnerInput, type RunnerState } from "./runner";
import type { Run } from "./run";
import { JUMP, LANES, laneX, speedAt, STEP_S, type Lane } from "./tuning";
import type { Coin, Obstacle } from "./types";

interface Plan {
  lane: Lane;
  action: Action;
  value: number;
}

export interface BotOptions {
  /** Sends it up ramps and along the roofs whenever it safely can, for the showcase. */
  flair?: boolean;
  /** Plays within a person's limits: moves reach the game late and never come too close together. */
  human?: { lagS: number; gapS: number };
}

const THINK_S = 0.1;
const HORIZON_S = 1.7;
/** The bot tries moves on the same fixed step the run takes, so what it foresees is what happens. */
const SIM_S = STEP_S;
const ACTIONS: readonly Action[] = ["none", "jump", "duck"];

/**
 * A computer runner for the showcase and the tests. Every tenth of a
 * second it tries each lane with each move in a copy of the run, a
 * little way ahead, and takes the one that stays alive longest and
 * picks up the most coins on the way. Given a person's limits, it looks
 * ahead from where its move will land, once the camera has read it.
 */
export class Bot {
  private plan: Plan = { lane: 0, action: "none", value: 0 };
  private nextThink = 0;
  private duckUntil = 0;
  private readonly near: Obstacle[] = [];
  private readonly flair: boolean;
  private hands: Hands | null = null;

  constructor(private readonly options: BotOptions = {}) {
    this.flair = !!options.flair;
  }

  /** Feeds the run this step's input. */
  drive(run: Run): void {
    if (run.crashed) return;
    if (this.options.human) return this.driveHuman(run, this.options.human);
    let move: { jump?: boolean; duck?: boolean; ducking?: boolean } = { ducking: run.time < this.duckUntil };
    if (run.time >= this.nextThink) {
      this.nextThink = run.time + THINK_S;
      this.plan = this.think(run, run.runner);
      if (this.plan.action === "jump") move = { jump: true };
      if (this.plan.action === "duck") {
        move = { duck: true, ducking: true };
        this.duckUntil = run.time + 0.3;
      }
    }
    run.input(this.plan.lane, move);
  }

  private driveHuman(run: Run, human: { lagS: number; gapS: number }): void {
    this.hands ??= new Hands(human.lagS, human.gapS, run.runner.lane);
    const hands = this.hands;
    if (run.time >= this.nextThink && hands.free(run.time)) {
      this.nextThink = run.time + THINK_S;
      const plan = this.think(run, this.ahead(run, hands.lane, human.lagS), true);
      hands.make(run.time, plan.lane, plan.action);
    }
    const seen = hands.take(run.time);
    if (seen.action === "duck") this.duckUntil = run.time + 0.3;
    run.input(seen.lane, { jump: seen.action === "jump", duck: seen.action === "duck", ducking: run.time < this.duckUntil });
  }

  /** Where the runner will be once a move made now reaches the game. */
  private ahead(run: Run, lane: Lane, seconds: number): RunnerState {
    const s: RunnerState = { ...run.runner };
    run.course.near(s.distance, 14 + seconds * run.speed, this.near);
    const input: RunnerInput = { lane, jump: false, duck: false, ducking: run.time < this.duckUntil };
    for (let t = 0; t < seconds; t += SIM_S) stepRunner(s, input, this.near, this.ability(run, s), SIM_S);
    return s;
  }

  private ability(run: Run, s: RunnerState): Abilities {
    return { speed: speedAt(s.distance), jumpHeight: run.powers.has("boots") ? JUMP.bootsHeight : JUMP.height, fly: run.powers.has("jetpack") ? JETPACK_HEIGHT : null };
  }

  private think(run: Run, s: RunnerState, single = false): Plan {
    const reach = HORIZON_S * speedAt(s.distance) + 4;
    run.course.near(s.distance, reach, this.near);
    const coins = run.course.coins.filter((c) => c.z > s.distance - 1 && c.z < s.distance + reach);
    // Power ups count as a pile of coins, so the bot goes for them.
    for (const p of run.course.pickups) {
      if (p.z < s.distance || p.z > s.distance + reach) continue;
      for (let k = 1; k <= 4; k++) coins.push({ id: -p.id * 10 - k, x: laneX(p.lane), y: p.y, z: p.z });
    }
    const ability = this.ability(run, s);
    let best: Plan | null = null;
    const waiting = new Map<Lane, number>();
    for (const lane of LANES) {
      for (const action of ACTIONS) {
        if (action !== "none" && ability.fly !== null) continue;
        // A person makes one move at a time: a step to the side, or a jump or a duck where they stand.
        if (single && action !== "none" && lane !== s.lane) continue;
        const { value, alive } = this.score(s, lane, action, coins, ability, run.powers.has("hoverboard"));
        if (action === "none") waiting.set(lane, alive);
        if (!best || value > best.value) best = { lane, action, value };
      }
    }
    // A jump or roll that could wait waits, so it peaks right over the barrier.
    if (best!.action !== "none" && (waiting.get(best!.lane) ?? 0) > 0.42) return { ...best!, action: "none" };
    return best!;
  }

  private score(start: RunnerState, lane: Lane, action: Action, coins: readonly Coin[], ability: Abilities, board: boolean): { value: number; alive: number } {
    const s: RunnerState = { ...start };
    const input: RunnerInput = { lane, jump: action === "jump", duck: action === "duck", ducking: action === "duck" };
    const taken = new Set<number>();
    let value = 0;
    let alive = HORIZON_S;
    for (let t = 0; t < HORIZON_S; t += SIM_S) {
      const result = stepRunner(s, input, this.near, { ...ability, speed: speedAt(s.distance) }, SIM_S);
      input.jump = false;
      input.duck = false;
      if (t > 0.3) input.ducking = false;
      if (result.contact) {
        // A stumble brings the guard, and a second one ends the run, so it is nearly as bad as a crash.
        alive = result.contact.type === "front" ? t : t + 0.3;
        break;
      }
      // Up on the roofs is the best view, and the bot likes to show off.
      if (s.y > 3 && this.flair) value += 0.05;
      for (const coin of coins) {
        if (taken.has(coin.id) || !touchesCoin(coin, s)) continue;
        taken.add(coin.id);
        value += 3;
      }
    }
    // Staying alive matters most by far. A hoverboard makes a crash cheaper, never free.
    value += alive * (board ? 60 : 100);
    if (action !== "none") value -= 1.5;
    if (lane !== start.lane) value -= 1;
    value -= Math.abs(laneX(lane)) * 0.1;
    return { value, alive };
  }
}
