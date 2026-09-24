import { JETPACK_HEIGHT } from "./powers";
import { bodyHeight, stepRunner, type RunnerInput, type RunnerState } from "./runner";
import type { Run } from "./run";
import { COIN, JUMP, LANES, laneX, speedAt, type Lane } from "./tuning";
import type { Coin, Obstacle } from "./types";

type Action = "none" | "jump" | "duck";

interface Plan {
  lane: Lane;
  action: Action;
  value: number;
}

const THINK_S = 0.1;
const HORIZON_S = 1.7;
const SIM_S = 1 / 60;
const ACTIONS: readonly Action[] = ["none", "jump", "duck"];

/**
 * A computer runner for the showcase and the tests. Every tenth of a
 * second it tries each lane with each move in a copy of the run, a
 * little way ahead, and takes the one that stays alive longest and
 * picks up the most coins on the way.
 */
export class Bot {
  private plan: Plan = { lane: 0, action: "none", value: 0 };
  private nextThink = 0;
  private duckUntil = 0;
  private readonly near: Obstacle[] = [];

  /** `flair` sends it up ramps and along the roofs whenever it safely can, for the showcase. */
  constructor(private readonly flair = false) {}

  /** Feeds the run this step's input. */
  drive(run: Run): void {
    if (run.crashed) return;
    let move: { jump?: boolean; duck?: boolean; ducking?: boolean } = { ducking: run.time < this.duckUntil };
    if (run.time >= this.nextThink) {
      this.nextThink = run.time + THINK_S;
      this.plan = this.think(run);
      if (this.plan.action === "jump") move = { jump: true };
      if (this.plan.action === "duck") {
        move = { duck: true, ducking: true };
        this.duckUntil = run.time + 0.3;
      }
    }
    run.input(this.plan.lane, move);
  }

  private think(run: Run): Plan {
    const s = run.runner;
    const reach = HORIZON_S * speedAt(s.distance) + 4;
    run.course.near(s.distance, reach, this.near);
    const coins = run.course.coins.filter((c) => c.z > s.distance - 1 && c.z < s.distance + reach);
    // Power ups count as a pile of coins, so the bot goes for them.
    for (const p of run.course.pickups) {
      if (p.z < s.distance || p.z > s.distance + reach) continue;
      for (let k = 1; k <= 4; k++) coins.push({ id: -p.id * 10 - k, x: laneX(p.lane), y: p.y, z: p.z });
    }
    const jumpHeight = run.powers.has("boots") ? JUMP.bootsHeight : JUMP.height;
    const fly = run.powers.has("jetpack") ? JETPACK_HEIGHT : null;
    let best: Plan | null = null;
    const waiting = new Map<Lane, number>();
    for (const lane of LANES) {
      for (const action of ACTIONS) {
        if (action !== "none" && fly !== null) continue;
        const { value, alive } = this.score(s, lane, action, coins, { speed: run.speed, jumpHeight, fly }, run.powers.has("hoverboard"));
        if (action === "none") waiting.set(lane, alive);
        if (!best || value > best.value) best = { lane, action, value };
      }
    }
    // A jump or roll that could wait waits, so it peaks right over the barrier.
    if (best!.action !== "none" && (waiting.get(best!.lane) ?? 0) > 0.42) return { ...best!, action: "none" };
    return best!;
  }

  private score(
    start: RunnerState,
    lane: Lane,
    action: Action,
    coins: readonly Coin[],
    ability: { speed: number; jumpHeight: number; fly: number | null },
    board: boolean,
  ): { value: number; alive: number } {
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
      const head = s.y + bodyHeight(s);
      for (const coin of coins) {
        if (taken.has(coin.id)) continue;
        if (Math.abs(coin.z - s.distance) < COIN.reachZ && Math.abs(coin.x - s.x) < COIN.reachX && coin.y > s.y - 0.3 && coin.y < head + 0.6) {
          taken.add(coin.id);
          value += 3;
        }
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
