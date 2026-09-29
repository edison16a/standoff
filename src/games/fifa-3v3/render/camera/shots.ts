import * as THREE from "three";
import type { TeamId } from "../../teams";
import type { MatchView } from "../../engine/view";
import type { Shot } from "./director";

export interface Framing {
  shot: Shot;
  focus?: THREE.Vector3;
  /** Name tags over the players: off for replays and close ups, where they clutter. */
  tags: boolean;
}

/** The replay's current angle: close on the kicker, or from behind the beaten keeper. */
export interface ReplayAngle {
  camera: "kicker" | "keeper";
  kicker: number | null;
  keeperTeam: TeamId | null;
}

/**
 * The broadcast director's choices: the high camera for play, a cut to
 * a close up of the scorer once the ball is in, the replay's angles, a
 * slow orbit of the winners at the final whistle, and then the trophy
 * ceremony's own cinematic shots.
 */
export function frameFor(view: MatchView, options: { lobby?: boolean; replay?: ReplayAngle | null } = {}): Framing {
  if (options.lobby) return { shot: "lobby", tags: true };
  if (options.replay) return replayFraming(view, options.replay);
  // A foul: follow the referee in, then close on the card. Then the set piece, from behind the ball.
  if (view.phase === "foul") return { shot: view.foul?.carded ? "card" : "foul", tags: false };
  // No name tags over the set piece: from behind the ball they stack into a tower over the goal.
  if (view.phase === "setpiece") return { shot: "setpiece", tags: false };
  if (view.phase === "play" && view.setPiece?.launched && view.setPiece.struckT < 1.6) return { shot: "setpiece-follow", tags: false };
  if (view.phase === "goal" && view.phaseT > 0.9) {
    const scorer = view.scorer !== null ? view.athletes[view.scorer] : undefined;
    if (scorer) return { shot: "closeup", focus: new THREE.Vector3(scorer.x, 0, scorer.z), tags: false };
  }
  if (view.ceremony) return { shot: "ceremony", tags: false };
  if (view.phase === "fulltime" && view.phaseT > 1.2 && view.winner !== null) {
    const winners = view.athletes.filter((a) => a.team === view.winner);
    const focus = new THREE.Vector3();
    for (const a of winners) focus.add(new THREE.Vector3(a.x, 0, a.z));
    focus.divideScalar(Math.max(1, winners.length));
    return { shot: "winners", focus, tags: false };
  }
  return { shot: "tv", tags: true };
}

/**
 * The close up follows the kicker's run and strike; the keeper's angle
 * stands behind the goal being attacked and follows the ball in. The
 * focus carries the attacked end in x, so the camera knows which goal.
 */
function replayFraming(view: MatchView, angle: ReplayAngle): Framing {
  const kicker = angle.kicker !== null ? view.athletes[angle.kicker] : undefined;
  if (angle.camera === "kicker" && kicker) return { shot: "replay-kicker", focus: new THREE.Vector3(kicker.x, 0, kicker.z), tags: false };
  const team = angle.keeperTeam ?? (view.ball.x < 0 ? 0 : 1);
  const keeper = view.keepers[team];
  return { shot: "replay-keeper", focus: new THREE.Vector3(team === 0 ? -1 : 1, 0, keeper.z), tags: false };
}
