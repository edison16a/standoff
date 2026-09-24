import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import type { Shot } from "./director";

export interface Framing {
  shot: Shot;
  focus?: THREE.Vector3;
  /** Name tags over the players: off for replays and close ups, where they clutter. */
  tags: boolean;
}

/**
 * The broadcast director's choices: the high camera for play, a cut to
 * a close up of the scorer once the ball is in, the replay angle, and a
 * slow orbit of the winners at the final whistle.
 */
export function frameFor(view: MatchView, options: { lobby?: boolean; replay?: boolean; goals?: number } = {}): Framing {
  if (options.lobby) return { shot: "lobby", tags: true };
  if (options.replay) return { shot: (options.goals ?? 0) % 2 === 0 ? "replay-end" : "replay-side", tags: false };
  if (view.phase === "goal" && view.phaseT > 0.9) {
    const scorer = view.scorer !== null ? view.athletes[view.scorer] : undefined;
    if (scorer) return { shot: "closeup", focus: new THREE.Vector3(scorer.x, 0, scorer.z), tags: false };
  }
  if (view.phase === "fulltime" && view.phaseT > 1.2 && view.winner !== null) {
    const winners = view.athletes.filter((a) => a.team === view.winner);
    const focus = new THREE.Vector3();
    for (const a of winners) focus.add(new THREE.Vector3(a.x, 0, a.z));
    focus.divideScalar(Math.max(1, winners.length));
    return { shot: "winners", focus, tags: true };
  }
  return { shot: "tv", tags: true };
}
