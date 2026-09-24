import type { Kart } from "./kart";
import type { Track } from "./track";
import { EFFECTS } from "./tuning";

/** Height the kart is dropped back from, so the return reads as a drop in. */
const DROP = 2.5;

/**
 * Where to put a kart back. Normally the last place it was safely on the
 * road. A kart that fell short of a jump goes to the far side instead,
 * since dropping it before the ramp with no speed would only repeat the
 * fall.
 */
export function respawnSpot(kart: Kart, track: Track): { s: number; d: number } {
  for (const gap of track.gaps) {
    const intoGap = track.forward(gap.start - 40, kart.loc.s);
    if (intoGap >= 0 && intoGap <= 40 + (gap.end - gap.start) + 12) return { s: track.wrap(gap.end + 8), d: 0 };
  }
  return { s: kart.race.safeS, d: kart.race.safeD };
}

export function respawn(kart: Kart, track: Track, spot: { s: number; d: number }): void {
  const p = track.pointAt(spot.s, spot.d);
  const f = track.frameAt(spot.s);
  kart.x = p.x;
  kart.z = p.z;
  kart.y = p.y + DROP;
  kart.vx = kart.vz = kart.vy = 0;
  kart.heading = Math.atan2(f.tx, f.tz);
  kart.airborne = true;
  kart.airTime = 0;
  kart.drift = 0;
  kart.driftTime = 0;
  kart.spin = 0;
  kart.timers.stun = 0;
  kart.timers.grace = EFFECTS.respawnGrace;
  kart.loc = track.locate(p.x, p.z, track.indexAt(spot.s));
  kart.race.stuckTime = 0;
  kart.race.stallFrom = -Infinity;
  // The jump in position is not driving: checkpoints must not see it as a crossing.
  kart.race.since = track.forward(kart.race.lastCheckpointS, kart.loc.s);
  kart.race.wrongWayTime = 0;
  kart.race.wrongWay = false;
}

/** True once a kart has dropped well below where the road would be. */
export function hasFallen(kart: Kart, track: Track): boolean {
  if (!kart.airborne) return false;
  const road = track.frameAt(kart.loc.s).y;
  return kart.y < road - 4 || kart.y < -60;
}
