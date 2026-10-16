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
 * What the lens is focused on in a replay or the ceremony: the ball the
 * replay follows, the QB holding it, the pass in the air and then the
 * scorer with it; the captain's trophy. Null in live play, which stays sharp.
 */
export function subject(view: MatchView, replay: ReplayShot | null, out: THREE.Vector3): THREE.Vector3 | null {
  if (view.ceremony) return out.set(CEREMONY_SPOT.x, 1.6, CEREMONY_SPOT.z);
  if (!replay) return null;
  const b = view.ball;
  // The pass is followed in the air; otherwise whoever has it, or the scorer once it is loose.
  const id = replay.angle === "run" ? replay.scorer : b.state === "pass" ? null : b.state === "held" ? b.holder : replay.scorer;
  const who = id === null ? undefined : view.athletes.find((a) => a.id === id);
  if (who) return out.set(who.x, 1.2, who.z);
  return out.set(b.x, Math.max(0.5, b.y), b.z);
}

/** How deep the sharp band is either side of the subject: tight in close, wider far away. */
export function focusRange(distance: number): number {
  return THREE.MathUtils.clamp(distance * 0.18, 0.8, 4);
}

const focusAt = new THREE.Vector3();

/** Over the QB the line in front of him stays readable, pushing and fighting, past the soft foreground. */
const LINE_RANGE = 9;

/**
 * Where the lens focuses, in metres from it, and how deep the sharp band
 * is either side, or null in live play. Over the QB the line ahead of
 * him stays sharp too; otherwise the band holds the subject and softens the rest.
 */
export function focusBand(view: MatchView, replay: ReplayShot | null, lens: THREE.Vector3): { distance: number; range: number } | null {
  const at = subject(view, replay, focusAt);
  if (!at) return null;
  const distance = at.distanceTo(lens);
  const b = view.ball;
  const overQb = replay?.angle === "trace" && b.state === "held" && b.holder === replay.passer;
  return { distance, range: overQb ? Math.max(LINE_RANGE, focusRange(distance)) : focusRange(distance) };
}
