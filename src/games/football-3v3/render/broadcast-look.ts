import * as THREE from "three";
import { CEREMONY_SPOT } from "../engine/ceremony";
import type { MatchView } from "../engine/view";
import type { ReplayShot } from "./camera/replay-shots";
import { CEREMONY_LOOK, LIVE_LOOK, REPLAY_LOOK, type Look } from "./post/look";

/** Which grade the moment wants: the live broadcast, the replay package or the trophy ceremony. */
export function lookFor(view: MatchView, replay: ReplayShot | null): Readonly<Look> {
  if (view.ceremony) return CEREMONY_LOOK;
  if (replay) return REPLAY_LOOK;
  return LIVE_LOOK;
}

/**
 * What the lens is focused on in a replay or the ceremony: the passer
 * behind the QB, the scorer at the catch, on the run and coming into the
 * end zone, the ball on the wide angle, the captain's trophy. Null in
 * live play, which stays sharp.
 */
export function subject(view: MatchView, replay: ReplayShot | null, out: THREE.Vector3): THREE.Vector3 | null {
  if (view.ceremony) return out.set(CEREMONY_SPOT.x, 1.6, CEREMONY_SPOT.z);
  if (!replay) return null;
  const find = (id: number | null) => (id === null ? undefined : view.athletes.find((a) => a.id === id));
  const who = replay.angle === "all22" ? undefined : replay.angle === "qb" ? find(replay.passer) : find(replay.scorer);
  if (who) return out.set(who.x, 1.2, who.z);
  return out.set(view.ball.x, Math.max(0.5, view.ball.y), view.ball.z);
}

/** How deep the sharp band is either side of the subject: tight in close, wider far away. */
export function focusRange(distance: number): number {
  return THREE.MathUtils.clamp(distance * 0.18, 0.8, 4);
}

const focusAt = new THREE.Vector3();

/** The wide angle shows the whole field, so its band covers all of it. */
const WIDE_RANGE = 60;

/**
 * Where the lens focuses, in metres from it, and how deep the sharp band
 * is either side, or null in live play. The wide angle keeps every
 * player sharp; the close angles hold the subject and soften the rest.
 */
export function focusBand(view: MatchView, replay: ReplayShot | null, lens: THREE.Vector3): { distance: number; range: number } | null {
  const at = subject(view, replay, focusAt);
  if (!at) return null;
  const distance = at.distanceTo(lens);
  return { distance, range: replay?.angle === "all22" ? WIDE_RANGE : focusRange(distance) };
}
