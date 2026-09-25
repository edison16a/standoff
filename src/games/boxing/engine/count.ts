import type { Fighter } from "./fighter";
import type { Match } from "./match";
import { RULES } from "./rules";
import { scorecards } from "./scoring";
import { other, type FighterId } from "./types";

export interface Stoppage {
  fighter: FighterId;
  method: "KO" | "TKO";
}

/** A boxer with no health left goes down, and the other goes to a neutral corner. */
export function knockDown(match: Match, down: Fighter, by: Fighter): void {
  down.knockdowns++;
  down.stats.knockdowns++;
  down.addRoundKnockdown(match.round);
  const final = down.knockdowns >= RULES.knockdownsToStop;
  down.down = { since: match.now, count: 0, nextCountAt: match.now + RULES.fallMs, raisedSince: null, risingAt: null, lowered: !down.input.raise, final };
  // The fallen boxer's own punch dies with them. The blow that did it follows through, so it
  // reads on screen, but it has landed and nothing more can be thrown until the fight goes on.
  down.punch = null;
  down.staggerUntil = -Infinity;
  match.footwork.setMode("neutral", down.id);
  match.emit({ type: "knockdown", fighter: down.id, by: by.id, knockdowns: down.knockdowns });
  if (final) {
    match.setPhase("stoppage", RULES.stoppageMs);
    match.stoppage = { fighter: down.id, method: "TKO" };
  } else {
    match.setPhase("knockdown");
  }
}

/** The referee's count, and getting up by raising both gloves. */
export function stepCount(match: Match): void {
  const down = match.fighters.find((f) => f.down)!;
  const state = down.down!;
  const now = match.now;
  if (state.risingAt !== null) {
    if (now < state.risingAt + RULES.riseMs + RULES.resumeMs) return;
    down.down = null;
    down.health = RULES.getUpHealth[Math.min(down.knockdowns, 2) - 1] ?? 30;
    down.staggerUntil = down.rockedUntil = -Infinity;
    match.setPhase("fight");
    match.footwork.setMode("fight");
    match.emit({ type: "resume" });
    return;
  }
  if (!down.input.raise) state.lowered = true;
  if (state.count >= 1 && state.lowered && down.input.raise) {
    state.raisedSince ??= now;
    if (now - state.raisedSince >= RULES.raiseHoldMs) {
      state.risingAt = now;
      // The other boxer leaves the neutral corner while this one gets up.
      match.footwork.setMode("fight");
      match.emit({ type: "rise", fighter: down.id });
      return;
    }
  } else {
    state.raisedSince = null;
  }
  if (now < state.nextCountAt) return;
  state.count++;
  state.nextCountAt += RULES.countMs;
  match.emit({ type: "count", fighter: down.id, count: state.count });
  if (state.count >= 10) {
    match.stoppage = { fighter: down.id, method: "KO" };
    finishStoppage(match);
  }
}

export function finishStoppage(match: Match): void {
  const { fighter, method } = match.stoppage!;
  const winner = other(fighter);
  const { cards, totals } = scorecards(match.fighters[0], match.fighters[1], match.round);
  match.emit({ type: "stoppage", fighter, by: winner, method });
  match.finish({ winner, method, round: match.round, second: Math.floor(match.roundClock / 1000), cards, totals });
}
