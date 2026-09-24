import type { Engine } from "@/games/fencing/engine/engine";
import type { ControllerState } from "@/games/fencing/protocol";
import { TOUCHES_TO_WIN } from "@/games/fencing/protocol";
import type { Lobby } from "./lobby";

/**
 * Builds the state message both phones render from. Before a match it is
 * mostly lobby data. During one it mirrors the engine.
 */
export function buildControllerState(lobby: Lobby, engine: Engine | null, names: [string, string]): ControllerState {
  const { seats } = lobby;
  const match = engine?.match;
  return {
    kind: "state",
    phase: engine?.phase ?? "lobby",
    scores: match ? [match.scores[1], match.scores[2]] : [0, 0],
    touchesToWin: TOUCHES_TO_WIN,
    names,
    picks: [seats[1].pick, seats[2].pick],
    ready: [seats[1].ready, seats[2].ready],
    connected: [seats[1].connected, seats[2].connected],
    computer: [seats[1].computer, seats[2].computer],
    countdown: engine ? engine.match.countdown(engine.now) : null,
    rematchVotes: match ? [match.rematchVotes[1], match.rematchVotes[2]] : [false, false],
    call: match?.call ?? null,
    winner: match?.winner ?? null,
  };
}
