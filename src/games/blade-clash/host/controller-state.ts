import type { Engine } from "@/games/blade-clash/engine/engine";
import { MAX_HEALTH } from "@/games/blade-clash/engine/rules";
import type { ControllerState } from "@/games/blade-clash/protocol";
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
    health: match ? [match.health[1], match.health[2]] : [MAX_HEALTH, MAX_HEALTH],
    maxHealth: MAX_HEALTH,
    names,
    picks: [seats[1].pick, seats[2].pick],
    ready: [seats[1].ready, seats[2].ready],
    connected: [seats[1].connected, seats[2].connected],
    computer: [seats[1].computer, seats[2].computer],
    countdown: engine ? engine.match.countdown(engine.now) : null,
    rematchVotes: match ? [match.rematchVotes[1], match.rematchVotes[2]] : [false, false],
    winner: match?.winner ?? null,
  };
}
