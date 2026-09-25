import { CHARACTER_IDS, type CharacterId } from "../../roster";
import type { Difficulty } from "../bots/brain";
import { createMatch, stepMatch } from "../match";
import type { MoveKey } from "../moves";
import { STAGE_IDS } from "../stages";
import type { MatchState } from "../types";

/**
 * Bot against bot balance checks. Matches are seeded, and slots and
 * stages rotate so no fighter always starts on the same side or stage.
 * Used by the skipped by default balance test while tuning.
 */

/** A match that has not ended after five minutes is called a draw. */
const MAX_FRAMES = 60 * 300;

/** Per move sums, keyed by move, with "bolt" for a bolt that lands after its cast ended. */
type MoveTable = Partial<Record<MoveKey | "bolt", number>>;

/** Sums over every game played, so each reads as an average per game. */
export interface Tally {
  games: number;
  wins: Record<CharacterId, number>;
  draws: number;
  dealt: Record<CharacterId, number>;
  taken: Record<CharacterId, number>;
  kos: Record<CharacterId, number>;
  falls: Record<CharacterId, number>;
  /** Falls nobody got credit for. */
  unforced: Record<CharacterId, number>;
  /** The percent carried at each credited fall. */
  koPercent: Record<CharacterId, number[]>;
  /** Damage landed while each move was playing, and how often each move was started. */
  moveDamage: Record<CharacterId, MoveTable>;
  moveSwings: Record<CharacterId, MoveTable>;
  seconds: number;
}

function perCharacter<T>(make: () => T): Record<CharacterId, T> {
  return Object.fromEntries(CHARACTER_IDS.map((c) => [c, make()])) as Record<CharacterId, T>;
}

export function emptyTally(): Tally {
  return {
    games: 0,
    wins: perCharacter(() => 0),
    draws: 0,
    dealt: perCharacter(() => 0),
    taken: perCharacter(() => 0),
    kos: perCharacter(() => 0),
    falls: perCharacter(() => 0),
    unforced: perCharacter(() => 0),
    koPercent: perCharacter(() => []),
    moveDamage: perCharacter(() => ({})),
    moveSwings: perCharacter(() => ({})),
    seconds: 0,
  };
}

/** Adds one step's swings, hits and KOs. `percents` is everyone's damage before the step. */
function countEvents(tally: Tally, state: MatchState, percents: readonly number[]): void {
  for (const e of state.events) {
    if (e.type === "swing") {
      const table = tally.moveSwings[state.fighters[e.id]!.character];
      table[e.move] = (table[e.move] ?? 0) + 1;
    } else if (e.type === "hit") {
      const a = state.fighters[e.attacker]!;
      const table = tally.moveDamage[a.character];
      const key = a.move ?? "bolt";
      table[key] = (table[key] ?? 0) + e.damage;
    } else if (e.type === "ko") {
      const f = state.fighters[e.id]!;
      if (e.by === null) tally.unforced[f.character]++;
      else tally.koPercent[f.character].push(percents[e.id]!);
    }
  }
}

/** Plays one all bot match to the end and adds it to the tally. The seed also picks the stage. */
export function playInto(tally: Tally, lineup: readonly CharacterId[], seed: number, difficulty: Difficulty): MatchState {
  const stage = STAGE_IDS[seed % STAGE_IDS.length]!;
  const state = createMatch(
    lineup.map((character) => ({ character, seat: null })),
    { seed, stage, difficulty },
  );
  while (state.phase !== "over" && state.frame < MAX_FRAMES) {
    const percents = state.fighters.map((f) => f.percent);
    stepMatch(state);
    countEvents(tally, state, percents);
  }
  tally.games++;
  tally.seconds += state.frame / 60;
  if (state.phase !== "over" || state.winner === null) tally.draws++;
  else tally.wins[state.fighters[state.winner]!.character]++;
  for (const f of state.fighters) {
    tally.dealt[f.character] += f.stats.damageDealt;
    tally.taken[f.character] += f.stats.damageTaken;
    tally.kos[f.character] += f.stats.kos;
    tally.falls[f.character] += f.stats.falls;
  }
  return state;
}

/** Four bots, one of each fighter, with the start order rotating every match. */
export function fourWay(games: number, difficulty: Difficulty, firstSeed = 1): Tally {
  const tally = emptyTally();
  for (let i = 0; i < games; i++) {
    const turn = i % 4;
    const order = [...CHARACTER_IDS.slice(turn), ...CHARACTER_IDS.slice(0, turn)];
    // Every other lap runs the order backwards, so neighbours change too.
    if (Math.floor(i / 4) % 2 === 1) order.reverse();
    playInto(tally, order, firstSeed + i, difficulty);
  }
  return tally;
}

/** Two bots, swapping sides every match. */
export function oneOnOne(a: CharacterId, b: CharacterId, games: number, difficulty: Difficulty, firstSeed = 1): Tally {
  const tally = emptyTally();
  for (let i = 0; i < games; i++) playInto(tally, i % 2 === 0 ? [a, b] : [b, a], firstSeed + i, difficulty);
  return tally;
}

/** Every pair of different fighters. */
export function pairings(): [CharacterId, CharacterId][] {
  return CHARACTER_IDS.flatMap((a, i) => CHARACTER_IDS.slice(i + 1).map((b): [CharacterId, CharacterId] => [a, b]));
}

/**
 * A short table for the console: wins, damage dealt and taken, KOs and
 * falls per game, falls nobody caused, the average percent at a KO, and
 * each fighter's top moves as damage and swings per game.
 */
export function describeTally(tally: Tally): string {
  const n = Math.max(1, tally.games);
  const per = (sum: number, digits = 0) => (sum / n).toFixed(digits).padStart(digits ? 4 : 3);
  const rows = CHARACTER_IDS.map((c) => {
    const ko = tally.koPercent[c];
    const koAt = ko.length ? Math.round(ko.reduce((s, p) => s + p, 0) / ko.length) : 0;
    const moves = Object.entries(tally.moveDamage[c])
      .sort((x, y) => y[1] - x[1])
      .slice(0, 4)
      .map(([k, d]) => `${k} ${per(d).trim()}/${per(tally.moveSwings[c][k as MoveKey | "bolt"] ?? 0).trim()}`)
      .join(", ");
    const cells = [`wins ${String(tally.wins[c]).padStart(4)}`, `dealt ${per(tally.dealt[c])}`, `taken ${per(tally.taken[c])}`, `kos ${per(tally.kos[c], 2)}`, `falls ${per(tally.falls[c], 2)}`, `unforced ${tally.unforced[c]}`, `ko at ${koAt}%`, `top ${moves}`];
    return `${c.padEnd(8)} ${cells.join("  ")}`;
  });
  return [`${n} games, ${tally.draws} draws, ${(tally.seconds / n).toFixed(0)} s each`, ...rows].join("\n");
}
