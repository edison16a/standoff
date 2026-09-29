import { makeAthlete } from "./athlete";
import { newBall, stepLoose, stepTumble } from "./ball";
import { driveFrom } from "./downs";
import { beginCall, idle, newPlay, stepCall, stepPresnap } from "./flow";
import { stepKick } from "./kick";
import { makeLinemen, stepLinemen } from "./linemen";
import { buildLineup, type Entrant } from "./lineup";
import { stepLive } from "./live";
import { Rng } from "./rng";
import { scoreWait } from "./score";
import { KICK, MATCH, STEP } from "./tuning";
import type { Command, MatchOptions, MatchState } from "./types";
import { afterReplay, afterScore, finishKick, resolveDead, whistle } from "./whistle";

export type { Entrant };

export const DEFAULT_OPTIONS: MatchOptions = {
  seed: 1,
  quarterSeconds: MATCH.quarterSeconds,
  pointsToWin: MATCH.pointsToWin,
  replays: true,
  level: "easy",
};

/**
 * A game ready for the first call. The entrants are completed into two
 * full sides (a quarterback and two runners each) unless `fill` is off;
 * their order becomes the athletes' ids. Red has the ball first.
 */
export function createMatch(entrants: readonly Entrant[], options: Partial<MatchOptions> = {}, fill = true): MatchState {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lineup = buildLineup(entrants, fill);
  const drive = driveFrom(0, MATCH.startLine);
  const state: MatchState = {
    phase: "call",
    phaseT: 0,
    quarter: 1,
    clock: opts.quarterSeconds,
    overtime: false,
    score: [0, 0],
    drive,
    play: newPlay(0),
    openedBy: 0,
    athletes: lineup.map((e, id) => makeAthlete(id, e.team, e.role, e.character, e.seat)),
    linemen: makeLinemen(),
    ball: newBall(),
    kick: null,
    winner: null,
    lastScore: null,
    rng: new Rng(opts.seed),
    events: [],
    options: opts,
    time: 0,
  };
  beginCall(state);
  return state;
}

/**
 * One fixed step of the game. Commands come from phones, keyed by athlete
 * id; computer players make their own. Events from the step are left in
 * `state.events` for the host to read.
 */
export function stepMatch(state: MatchState, commands: ReadonlyMap<number, Command> = new Map(), dt: number = STEP): void {
  state.events = [];
  state.time += dt;
  state.phaseT += dt;
  switch (state.phase) {
    case "call":
      idle(state, dt);
      stepLinemen(state, dt, false);
      return stepCall(state, commands);
    case "presnap":
      stepLinemen(state, dt, false);
      return stepPresnap(state, commands, dt);
    case "live":
      stepLive(state, commands, dt);
      if (state.play.end) whistle(state);
      return;
    case "kick":
      return kickStep(state, commands, dt);
    case "dead":
      idle(state, dt);
      stepLinemen(state, dt, false);
      if (state.ball.mode === "loose") stepLoose(state.ball, dt);
      if (state.phaseT >= MATCH.deadWait) resolveDead(state);
      return;
    case "score":
      idle(state, dt);
      if (state.lastScore && state.phaseT >= scoreWait(state.lastScore.kind)) afterScore(state);
      return;
    case "replay":
      // The host ends the replay; this only guards against it never doing so.
      if (state.phaseT >= MATCH.replay) afterReplay(state);
      return;
    case "quarter":
      idle(state, dt);
      if (state.phaseT >= MATCH.quarterBreak) beginCall(state);
      return;
    case "final":
      idle(state, dt);
      return;
  }
}

function kickStep(state: MatchState, commands: ReadonlyMap<number, Command>, dt: number): void {
  idle(state, dt);
  const kick = state.kick;
  if (!kick) return;
  // The kick in the air runs the clock, so a side cannot kick the game away without it moving.
  if (kick.stage === "flight" && !state.overtime) state.clock = Math.max(0, state.clock - dt);
  if (kick.stage !== "done") return stepKick(state, commands, dt);
  kick.t += dt;
  if (state.ball.mode === "kick") {
    stepTumble(state.ball, dt);
    if (state.ball.pos.y <= 0.12) state.ball.mode = "loose";
  } else stepLoose(state.ball, dt);
  if (kick.t >= KICK.resultWait) finishKick(state);
}

/** The host's replay is over, played through or skipped by everyone. */
export function endReplay(state: MatchState): void {
  if (state.phase === "replay") afterReplay(state);
}
