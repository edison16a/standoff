import type { Engine } from "@/game/engine";
import type { ControllerState } from "@/shared/protocol";
import { TOUCHES_TO_WIN } from "@/shared/protocol";
import type { Lobby } from "./lobby";

/**
 * Builds the state message both phones render from. Before a match it is
 * mostly lobby data. During one it mirrors the engine.
 */
export function buildControllerState(lobby: Lobby, engine: Engine | null): ControllerState {
  const { seats } = lobby;
  const match = engine?.match;
  return {
    kind: "state",
    phase: engine?.phase ?? "lobby",
    scores: match ? [match.scores[1], match.scores[2]] : [0, 0],
    touchesToWin: TOUCHES_TO_WIN,
    picks: [seats[1].pick, seats[2].pick],
    ready: [seats[1].ready, seats[2].ready],
    connected: [seats[1].connected, seats[2].connected],
    countdown: engine ? engine.match.countdown(engine.now) : null,
    skipVotes: match ? [match.skipVotes[1], match.skipVotes[2]] : [false, false],
    rematchVotes: match ? [match.rematchVotes[1], match.rematchVotes[2]] : [false, false],
    call: match?.call ?? null,
    winner: match?.winner ?? null,
  };
}
