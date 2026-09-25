import type { CharacterId } from "../roster";
import { makeBrain } from "./bots/brain";
import { botCommand } from "./bots/think";
import { resolveMelee } from "./combat";
import { makeFighter, stepFighter } from "./fighter";
import { stepProjectiles } from "./projectiles";
import { Rng } from "./rng";
import { STAGES } from "./stages";
import { checkBlastZone, checkWinner } from "./stocks";
import { RULES, STEP } from "./tuning";
import type { Command, MatchOptions, MatchState } from "./types";

export interface Entrant {
  character: CharacterId;
  /** The phone playing them, or null for a bot. */
  seat: number | null;
}

export const DEFAULT_OPTIONS: MatchOptions = { seed: 1, stage: "dojo-rooftop", stocks: RULES.stocks, difficulty: "normal" };

const IDLE: Command = { x: 0, y: 0 };

/**
 * A match ready for its countdown. Entrants take the start spots left to
 * right in order, up to four; bots get a brain at the match difficulty.
 */
export function createMatch(entrants: readonly Entrant[], options: Partial<MatchOptions> = {}): MatchState {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stage = STAGES[opts.stage];
  const lineup = entrants.slice(0, 4);
  const spots = spreadSpots(stage.spawns, lineup.length);
  const fighters = lineup.map((e, id) => {
    const f = makeFighter(id, id, e.character, e.seat, spots[id]!, opts.stocks);
    if (e.seat === null) f.brain = makeBrain(opts.difficulty, id);
    return f;
  });
  return {
    phase: "ready",
    phaseFrame: 0,
    frame: 0,
    stage,
    fighters,
    projectiles: [],
    nextProjectile: 0,
    eliminated: [],
    winner: null,
    rng: new Rng(opts.seed),
    events: [],
    options: opts,
  };
}

/** Two fighters start at the outer spots facing in; more fill in between. */
function spreadSpots(spawns: number[], count: number): number[] {
  if (count === 2) return [spawns[0]!, spawns[spawns.length - 1]!];
  if (count === 3) return [spawns[0]!, (spawns[1]! + spawns[2]!) / 2, spawns[3]!];
  return spawns.slice(0, Math.max(1, count));
}

/**
 * One fixed step. Commands come from phones, keyed by fighter id; bots
 * make their own. Events from the step are left in `state.events`.
 */
export function stepMatch(state: MatchState, commands: ReadonlyMap<number, Command> = new Map()): void {
  state.events = [];
  state.frame++;
  state.phaseFrame++;
  const live = state.phase === "fight";
  if (state.phase === "ready") countdown(state);
  for (const f of state.fighters) {
    const cmd = !live ? IDLE : f.brain ? botCommand(state, f) : (commands.get(f.id) ?? IDLE);
    stepFighter(state, f, cmd, STEP);
  }
  resolveMelee(state);
  stepProjectiles(state, STEP);
  checkBlastZone(state);
  if (state.phase === "fight" && checkWinner(state)) setPhase(state, "game");
  else if (state.phase === "game" && state.phaseFrame >= RULES.gameHold) {
    setPhase(state, "over");
    state.events.push({ type: "over" });
  }
}

function countdown(state: MatchState): void {
  if (state.phaseFrame === 1) state.events.push({ type: "countdown", call: "ready" });
  if (state.phaseFrame < RULES.countdown) return;
  setPhase(state, "fight");
  state.events.push({ type: "countdown", call: "fight" });
}

function setPhase(state: MatchState, phase: MatchState["phase"]): void {
  state.phase = phase;
  state.phaseFrame = 0;
}

/** Hands a fighter to a bot, or back to their phone, when a phone drops or returns. */
export function setBot(state: MatchState, id: number, bot: boolean): void {
  const f = state.fighters[id];
  if (!f) return;
  f.brain = bot ? (f.brain ?? makeBrain(state.options.difficulty, f.slot)) : null;
}
