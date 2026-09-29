import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { makeCall, snap } from "./flow";
import type { Entrant } from "./lineup";
import { createMatch, stepMatch } from "./match";
import type { MatchEvent } from "./events";
import type { Athlete, Command, MatchState } from "./types";
import { v2 } from "./vec";

/**
 * Helpers for the engine's tests: games with phones on chosen seats, a
 * snapped play, and players put where a test needs them.
 */

/** Red: seat 0 at quarterback, seat 1 a runner. Blue: seat 2 at quarterback, seat 3 a runner. Bots fill the rest. */
export const PHONES: Entrant[] = [
  { team: 0, character: "blaze", seat: 0, role: "qb" },
  { team: 0, character: "jet", seat: 1, role: "runner" },
  { team: 1, character: "ace", seat: 2, role: "qb" },
  { team: 1, character: "tank", seat: 3, role: "runner" },
];

export function game(level: BotLevel = "training", entrants: Entrant[] = PHONES, seed = 7): MatchState {
  return createMatch(entrants, { seed, level, replays: false });
}

/** Called and snapped, with the ball in the quarterback's hands. */
export function snapped(state: MatchState): MatchState {
  makeCall(state, "throw");
  snap(state, false);
  run(state, 0.4);
  return state;
}

export function bySeat(state: MatchState, seat: number): Athlete {
  return state.athletes.find((a) => a.seat === seat)!;
}

export function place(a: Athlete, x: number, z: number, vx = 0, vz = 0): void {
  a.pos = v2(x, z);
  a.vel = v2(vx, vz);
}

/** Steps the game for some seconds, with the same commands each step, and returns every event. */
export function run(state: MatchState, seconds: number, commands: Map<number, Command> | ((t: number) => Map<number, Command>) = new Map()): MatchEvent[] {
  const events: MatchEvent[] = [];
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepMatch(state, typeof commands === "function" ? commands(i / 60) : commands);
    events.push(...state.events);
  }
  return events;
}

export const cmd = (id: number, c: Partial<Command> = {}): Map<number, Command> => new Map([[id, { move: v2(), ...c }]]);
