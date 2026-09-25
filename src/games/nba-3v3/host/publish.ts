import type { Player } from "@/platform/games/game-api";
import type { Match } from "../engine/match";
import { canSteal } from "../engine/defend";
import { greenHalfMs, GREEN_MS } from "../engine/shot-model";
import { RULES, SHOT } from "../engine/tuning";
import type { CourtState, Phase, PhoneState } from "../protocol";
import { CHARACTERS } from "../roster";
import { useNbaStore as store, type ResultRow } from "./host-store";
import type { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";

export interface PublishContext {
  nowMs: number;
  players: readonly Player[];
  lobby: Lobby;
  driver: MatchDriver | null;
  phones: PhoneLink;
}

export function phaseOf(driver: MatchDriver | null): Phase {
  const m = driver?.match;
  if (!m) return "lobby";
  return m.phase === "countdown" ? "countdown" : m.phase === "over" ? "over" : "live";
}

/** The name a player goes by on screen: their own for people, the star's for computer players. */
export function nameFor(m: Match, id: number, players: readonly Player[]): string {
  const a = m.athletes[id];
  if (!a) return "";
  const person = a.seat !== null ? players.find((p) => p.seat === a.seat) : undefined;
  return person?.name || CHARACTERS[a.character].short;
}

/** What the scoreboard says during free throws, or null the rest of the time. */
export function freeThrowText(m: Match): string | null {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  return ft ? `Free throw ${ft.shot} of 2` : null;
}

/** What one phone's controller shows for its player. */
export function courtState(m: Match, id: number, players: readonly Player[]): CourtState {
  const a = m.athletes[id]!;
  const holder = m.holder;
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  const mine = ft?.shooter === a.id;
  return {
    team: a.team,
    score: [m.score[0], m.score[1]],
    shotClock: Math.max(0, Math.ceil(m.shotClock)),
    hasBall: holder === a,
    attacking: m.offence === a.team,
    holder: holder ? nameFor(m, holder.id, players) : null,
    mustClear: m.needsClear && m.offence === a.team,
    canSteal: canSteal(m, a),
    freeThrow: ft ? { mine, n: ft.shot, ready: mine && ft.stage === "set" } : null,
    // At the line the green band is wider: a set shot with nobody in the face.
    meter: { fullMs: SHOT.meterMs, greenMs: GREEN_MS, halfMs: greenHalfMs(CHARACTERS[a.character].stats.shooting, a.onFire, mine) },
    onFire: a.onFire,
    // The whole break counts, from the basket to the check, so the phone never shows a loose ball meanwhile.
    checking: m.phase === "dead" || m.phase === "check",
    countdown: m.phase === "countdown" ? Math.max(0, Math.ceil(RULES.countdown - m.phaseT)) : null,
  };
}

function results(m: Match, players: readonly Player[]): ResultRow[] {
  return m.athletes.map((a) => ({
    id: a.id, team: a.team, name: nameFor(m, a.id, players), seat: a.seat, character: a.character,
    points: a.box.points, rebounds: a.box.rebounds, assists: a.box.assists, steals: a.box.steals, blocks: a.box.blocks, made: a.box.made, attempts: a.box.attempts,
  }));
}

/** Writes the current state to the big screen's store and to every phone. */
export function publish(c: PublishContext): void {
  const m = c.driver?.match ?? null;
  const phase = phaseOf(c.driver);
  const seats = c.players.map((p) => {
    const s = c.lobby.seats.get(p.seat);
    return { seat: p.seat, name: p.name, connected: p.connected, pick: s?.pick ?? null, ready: s?.ready ?? false, team: s?.team ?? null };
  });
  const spots = c.lobby.spots().map((s) => ({ ...s, name: s.seat === null ? "Computer" : (c.players.find((p) => p.seat === s.seat)?.name ?? "Player") }));
  const inGame = new Set(c.driver ? [...c.driver.athleteBySeat.keys()] : []);
  store.setState({
    phase,
    seats,
    spots,
    score: m ? [m.score[0], m.score[1]] : [0, 0],
    shotClock: m ? Math.max(0, Math.ceil(m.shotClock)) : RULES.shotClock,
    offence: m?.offence ?? 0,
    mustClear: m?.needsClear ?? false,
    checking: m?.phase === "dead" || m?.phase === "check",
    countdown: m && m.phase === "countdown" ? Math.max(0, Math.ceil(RULES.countdown - m.phaseT)) : null,
    freeThrow: m ? freeThrowText(m) : null,
    // Once someone has won, nobody is on game point any more.
    gamePoint: m && m.phase !== "over" ? [m.gamePoint[0], m.gamePoint[1]] : [false, false],
    winner: m?.winner ?? null,
    results: m && m.phase === "over" ? results(m, c.players) : [],
    waiting: c.driver ? seats.filter((s) => s.connected && !inGame.has(s.seat)).map((s) => s.name) : [],
  });
  for (const seat of c.lobby.connectedSeats) {
    const s = c.lobby.seats.get(seat)!;
    const id = c.driver?.athleteBySeat.get(seat);
    const athlete = m && id !== undefined ? m.athletes[id] : undefined;
    const state: PhoneState = {
      kind: "state",
      phase,
      taken: c.lobby.taken(seat),
      pick: s.pick,
      ready: s.ready,
      team: s.team,
      playing: !!athlete,
      court: m && athlete ? courtState(m, athlete.id, c.players) : null,
      result: m && athlete && m.phase === "over" ? { won: m.winner === athlete.team, points: athlete.box.points, rebounds: athlete.box.rebounds, assists: athlete.box.assists } : null,
    };
    c.phones.sendState(seat, state, c.nowMs);
  }
}
