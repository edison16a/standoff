import type { SplitPane } from "@/games/kit/split/SplitMap";
import { playerColor } from "@/games/kit/players";
import type { Player } from "@/platform/games/game-api";
import type { Fighter, TeamId } from "../engine/fighter";
import { RULES } from "../engine/tuning";
import { ROUND_MAX, type Mode, type PhoneState, type RoomPhase } from "../protocol";
import { useCounterStore as store, type PaneView, type ResultRow, type SpotView } from "./host-store";
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

/** The colour of a place nobody holds yet. */
const EMPTY = "#64748b";

export function roomPhaseOf(driver: MatchDriver | null): RoomPhase {
  if (!driver) return "lobby";
  return driver.battle.match.phase === "done" ? "results" : "match";
}

const nameIn = (players: readonly Player[], seat: number) => players.find((p) => p.seat === seat)?.name || `Player ${seat}`;

function paneView(d: MatchDriver, f: Fighter, rect: PaneView["rect"], online: boolean): PaneView {
  const g = f.gun;
  return {
    rect,
    fighter: f.id,
    name: d.labels[f.id]!.name,
    colour: d.labels[f.id]!.color,
    team: f.team,
    gun: g.id,
    health: Math.max(0, Math.round(f.health)),
    alive: f.alive,
    ammo: g.ammo,
    magazine: g.spec.magazine,
    reloading: g.reloading,
    reload: g.reloading ? Math.min(1, Math.max(0, 1 - g.reloadLeftSeconds / g.spec.reload)) : 0,
    away: !online,
  };
}

function results(d: MatchDriver): ResultRow[] {
  return d.battle.fighters.map((f) => ({
    id: f.id, team: f.team, name: d.labels[f.id]!.name, colour: d.labels[f.id]!.color, bot: f.seat === null,
    character: f.character, gun: f.gun.id, kills: f.kills, deaths: f.deaths, headshots: f.headshots, damage: Math.round(f.damage),
  }));
}

/** The lobby's split screen, or the match's, as the kit's split map draws it. */
function splitOf(c: PublishContext): SplitPane[] {
  if (c.driver) {
    const d = c.driver;
    return d.panes.flatMap((p) => (p.fighter === null ? [] : [{ name: d.labels[p.fighter]!.name, color: d.labels[p.fighter]!.color, rect: p.rect }]));
  }
  return [...c.lobby.views()].map(([seat, rect]) => ({ name: nameIn(c.players, seat), color: playerColor(seat), rect }));
}

/** Writes the current state to the big screen's store and to every phone. */
export function publish(c: PublishContext): void {
  const { lobby, driver: d } = c;
  const phase = roomPhaseOf(d);
  const m = d?.battle.match ?? null;
  const online = (seat: number) => c.players.some((p) => p.seat === seat && p.connected);
  const spots: SpotView[] = lobby.spots().map((s) => {
    const seatState = s.seat === null ? undefined : lobby.seats.get(s.seat);
    return {
      team: s.team,
      seat: s.seat,
      name: s.seat === null ? "Computer" : nameIn(c.players, s.seat),
      colour: s.seat === null ? EMPTY : playerColor(s.seat),
      gun: seatState?.gun ?? null,
      ready: s.seat !== null && lobby.isReady(s.seat),
    };
  });
  const inMatch = new Set(d ? [...d.bySeat.keys()] : []);
  const tvRect = d?.panes.find((p) => p.fighter === null)?.rect ?? null;
  store.setState({
    phase,
    mode: lobby.mode,
    difficulty: lobby.difficulty,
    spots,
    bench: lobby.bench.map((seat) => nameIn(c.players, seat)),
    choosing: spots.filter((s) => s.seat !== null && !s.ready).map((s) => s.name),
    canStart: lobby.canStart(),
    split: splitOf(c),
    matchPhase: m?.phase ?? "countdown",
    round: m?.round ?? 1,
    score: m ? [m.score[0], m.score[1]] : [0, 0],
    roundsToWin: m?.roundsToWin ?? RULES.roundsToWin,
    countdown: m?.phase === "countdown" ? Math.max(1, Math.ceil(m.timer)) : null,
    panes: d ? d.panes.flatMap((p) => (p.fighter === null ? [] : [paneView(d, d.battle.fighters[p.fighter]!, p.rect, online(d.battle.fighters[p.fighter]!.seat!))])) : [],
    tv: tvRect,
    winner: m?.winner ?? null,
    results: d && (m?.phase === "match-over" || m?.phase === "done") ? results(d) : [],
    waiting: d ? lobby.connectedSeats.filter((seat) => !inMatch.has(seat)).map((seat) => nameIn(c.players, seat)) : [],
  });
  const banner = store.getState().banner?.text ?? null;
  const views = lobby.views();
  for (const seat of lobby.connectedSeats) c.phones.sendState(seat, phoneState(c, seat, phase, views.get(seat) ?? null, banner), c.nowMs);
}

function phoneState(c: PublishContext, seat: number, phase: RoomPhase, lobbyView: PhoneState["zone"], banner: string | null): PhoneState {
  const { lobby, driver: d } = c;
  const s = lobby.seats.get(seat);
  const f = d?.fighterOf(seat);
  const m = d?.battle.match;
  const mode: Mode = d ? (d.battle.fighters.length > 2 ? "2v2" : "1v1") : lobby.mode;
  const team: TeamId | null = f?.team ?? s?.team ?? null;
  const mate = f ? d!.battle.fighters.find((o) => o.team === f.team && o.id !== f.id) : undefined;
  const lobbyMate = !f && team !== null ? lobby.spots().find((spot) => spot.team === team && spot.seat !== seat) : undefined;
  const teammate = mate ? d!.labels[mate.id]!.name : lobbyMate ? (lobbyMate.seat === null ? "Computer" : nameIn(c.players, lobbyMate.seat)) : null;
  const clampScore = (n: number) => Math.min(RULES.roundsToWin, n);
  const mine = team ?? 0;
  const gun = f?.gun;
  return {
    kind: "state",
    phase,
    mode,
    team,
    teammate,
    // A phone waiting out a match aims at the whole screen, as the host shows it; its view comes with the next match.
    zone: f ? d!.viewOf(seat) : d ? null : lobbyView,
    gun: gun?.id ?? s?.gun ?? null,
    character: f?.character ?? null,
    ready: s?.ready ?? false,
    playing: !!f,
    health: f ? Math.max(0, Math.round(f.health)) : RULES.health,
    alive: f?.alive ?? true,
    ammo: gun?.ammo ?? 0,
    magazine: gun?.spec.magazine ?? 1,
    reloading: gun?.reloading ?? false,
    reloadLeft: gun ? Math.min(10, Math.round(gun.reloadLeftSeconds * 10) / 10) : 0,
    armed: !!f && f.alive && m?.phase === "fight",
    // Draws can run a match past ten rounds; the phone's count stops there.
    round: Math.min(ROUND_MAX, m?.round ?? 0),
    score: m ? [clampScore(m.score[mine]), clampScore(m.score[1 - mine]!)] : [0, 0],
    kills: Math.min(999, f?.kills ?? 0),
    deaths: Math.min(999, f?.deaths ?? 0),
    won: f && m?.winner !== null && m?.winner !== undefined ? m.winner === f.team : null,
    banner: banner ? banner.slice(0, 24) : null,
  };
}
