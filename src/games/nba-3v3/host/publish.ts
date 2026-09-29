import type { Player } from "@/platform/games/game-api";
import type { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { canSteal, stealInReach } from "../engine/defend";
import { guardStatus } from "../engine/guard";
import { greenHalfMs, GREEN_MS } from "../engine/shot-model";
import { RULES, SHOT } from "../engine/tuning";
import type { CourtState, Phase, PhoneState } from "../protocol";
import { BUILDS, cpuName } from "../builds";
import { ceremonyCard } from "./ceremony-card";
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
  /** The host asked for the box scores before the ceremony brought them in. */
  statsNow: boolean;
}

export function phaseOf(driver: MatchDriver | null): Phase {
  const m = driver?.match;
  if (!m) return "lobby";
  if (driver.replays.replay) return "replay";
  return m.phase === "countdown" ? "countdown" : m.phase === "over" ? "over" : "live";
}

/** Who has voted to skip the replay, by name, in the order they play. */
export function replayVotes(driver: MatchDriver | null, players: readonly Player[]): { seat: number; name: string; done: boolean }[] {
  const r = driver?.replays.replay;
  if (!r || !driver) return [];
  return r.voters.map((seat) => ({ seat, name: nameFor(driver.match, driver.athleteBySeat.get(seat) ?? -1, players) || "Player", done: r.skipped.has(seat) }));
}

/** The name a player goes by on screen: their own for people, CPU and the build for computer players, like CPU Shooter. */
export function nameFor(m: Match, id: number, players: readonly Player[]): string {
  const a = m.athletes[id];
  if (!a) return "";
  const person = a.seat !== null ? players.find((p) => p.seat === a.seat) : undefined;
  return person?.name || cpuName(a.build);
}

/** What the scoreboard says during free throws, or null the rest of the time. */
export function freeThrowText(m: Match): string | null {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  return ft ? `Free throw ${ft.shot} of ${ft.shots}` : null;
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
    stealReach: stealInReach(m, a),
    // The check up counts too, so the defence can take hold of Guard before play starts.
    defending: (m.phase === "live" || m.phase === "check") && m.defending(a),
    guard: guardStatus(m, a),
    freeThrow: ft ? { mine, n: ft.shot, of: ft.shots, ready: mine && ft.stage === "set" } : null,
    // At the line the green band is wider: a set shot with nobody in the face.
    meter: { fullMs: SHOT.meterMs, greenMs: GREEN_MS, halfMs: greenHalfMs(BUILDS[a.build].stats.shooting, a.onFire, mine) },
    onFire: a.onFire,
    // The whole break counts, from the basket to the check, so the phone never shows a loose ball meanwhile.
    checking: m.phase === "dead" || m.phase === "check",
    countdown: m.phase === "countdown" ? Math.max(0, Math.ceil(RULES.countdown - m.phaseT)) : null,
  };
}

/** A player's line on the phone at the end. */
function lineOf(a: Athlete): { points: number; rebounds: number; assists: number; steals: number; blocks: number } {
  const b = a.box;
  return { points: b.points, rebounds: b.rebounds, assists: b.assists, steals: b.steals, blocks: b.blocks };
}

function results(m: Match, players: readonly Player[]): ResultRow[] {
  return m.athletes.map((a) => ({
    id: a.id, team: a.team, name: nameFor(m, a.id, players), seat: a.seat, build: a.build,
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
  const spots = c.lobby.spots().map((s) => ({ ...s, name: s.seat === null ? cpuName(s.build) : (c.players.find((p) => p.seat === s.seat)?.name ?? "Player") }));
  const inGame = new Set(c.driver ? [...c.driver.athleteBySeat.keys()] : []);
  const votes = replayVotes(c.driver, c.players);
  const replay = c.driver?.replays.replay;
  store.setState({
    replay: replay ? { view: replay.view, scorer: nameFor(replay.ghost, replay.scorer, c.players), votes: votes.map(({ name, done }) => ({ name, done })) } : null,
    // The results wait for the replay and then the trophy ceremony.
    replayDue: !!m && m.phase === "over" && !c.driver?.ceremony,
    ceremony: m && c.driver ? ceremonyCard(m, c.driver.ceremony, (id) => nameFor(m, id, c.players), c.statsNow) : null,
    phase,
    seats,
    spots,
    bots: c.lobby.bots,
    level: c.lobby.level,
    startBlock: c.lobby.startBlock(),
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
  // Until the replay rolls the phones keep the controller up, rather than flash the result before the Skip button.
  const early = !!c.driver?.replays.pending;
  for (const seat of c.lobby.connectedSeats) {
    const s = c.lobby.seats.get(seat)!;
    const id = c.driver?.athleteBySeat.get(seat);
    const athlete = m && id !== undefined ? m.athletes[id] : undefined;
    const state: PhoneState = {
      kind: "state",
      phase: early ? "live" : phase,
      name: c.players.find((p) => p.seat === seat)?.name ?? "",
      taken: c.lobby.taken(seat),
      pick: s.pick,
      ready: s.ready,
      team: s.team,
      playing: !!athlete,
      court: m && athlete ? courtState(m, athlete.id, c.players) : null,
      replay: replay && athlete ? { voted: replay.skipped.has(seat), votes: votes.map(({ name, done }) => ({ name, done })) } : null,
      result: m && athlete && m.phase === "over" && !early ? { won: m.winner === athlete.team, ...lineOf(athlete) } : null,
    };
    c.phones.sendState(seat, state, c.nowMs);
  }
}
