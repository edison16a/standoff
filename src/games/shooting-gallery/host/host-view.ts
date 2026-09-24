import type { Player } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import type { Round } from "../engine/round";
import type { GalleryPhase, GalleryState, PlayerView } from "../protocol";
import type { SeatSetup } from "./lobby";

export interface ViewInput {
  phase: GalleryPhase;
  seconds: number;
  players: readonly Player[];
  /** Seats that have joined at some point, so an empty seat is never listed. */
  known: ReadonlySet<Seat>;
  setups: ReadonlyMap<Seat, SeatSetup>;
  round: Round | null;
  bestPlaces: ReadonlyMap<Seat, number | null>;
  winners: readonly Seat[];
}

export function displayName(players: readonly Player[], seat: Seat): string {
  return players[seat - 1]?.name || `Player ${seat}`;
}

/**
 * The state every phone mirrors and the computer's HUD draws, built from
 * the session's parts. Players in the round are listed by standing so
 * the leaderboard reads top down. Late joiners follow them.
 */
export function buildState(input: ViewInput): GalleryState {
  const { round, players } = input;
  const standings = round?.standings() ?? [];
  const inRound = new Set(round?.seats ?? []);
  const seats = [...new Set([...standings.map((s) => s.seat), ...[...input.known].sort((a, b) => a - b)])];

  const views: PlayerView[] = seats
    .filter((seat) => inRound.has(seat) || players[seat - 1]?.connected)
    .map((seat) => {
      const standing = standings.find((s) => s.seat === seat);
      const setup = input.setups.get(seat);
      return {
        seat,
        name: displayName(players, seat),
        connected: players[seat - 1]?.connected ?? false,
        step: setup?.step ?? null,
        ready: setup?.ready ?? false,
        inRound: inRound.has(seat),
        score: standing?.score ?? 0,
        shots: standing?.shots ?? 0,
        hits: standing?.hits ?? 0,
        place: standing?.place ?? 0,
        best: input.bestPlaces.get(seat) ?? null,
      };
    });

  const counting = input.phase === "countdown" || input.phase === "playing";
  return {
    kind: "state",
    phase: input.phase,
    seconds: input.seconds,
    timeLeft: counting && round ? Math.ceil(round.timeLeft) : input.phase === "results" ? 0 : input.seconds,
    countdown: input.phase === "countdown" && round ? round.countdown : 0,
    players: views,
    winners: [...input.winners],
  };
}
