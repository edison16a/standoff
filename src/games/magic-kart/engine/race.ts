import type { Emit } from "./events";
import { speedOf, type Kart } from "./kart";
import type { Track } from "./track";
import { RACE } from "./tuning";

/** Metres between checkpoints on this track. */
export function checkpointSpacing(track: Track): number {
  return track.length / RACE.checkpoints;
}

/** Whole laps done, from checkpoints passed. */
export function lapsDone(kart: Kart): number {
  return Math.floor(kart.race.checkpoints / RACE.checkpoints);
}

/** The lap to show, 1 to the race length. */
export function currentLap(kart: Kart): number {
  return Math.min(RACE.laps, lapsDone(kart) + 1);
}

/**
 * Lap counting. The lap is split into evenly spaced checkpoints, the
 * finish line being the first, and they only count in order. A kart that
 * finds a way to skip one gains nothing: its ranking distance is
 * measured from the last checkpoint it really passed, and if it gets too
 * far from that it is put back there.
 *
 * Returns "lost" when the kart has skipped ahead and must be put back.
 */
export function updateProgress(kart: Kart, track: Track, time: number, finishedSoFar: number, emit: Emit): "ok" | "lost" {
  const r = kart.race;
  const seg = checkpointSpacing(track);
  const before = r.since;
  let since = track.forward(r.lastCheckpointS, kart.loc.s);
  // The next checkpoint counts only when driven through forwards, from just behind it to just past it.
  if (!r.finished && before < seg && since >= seg && since - before < 12) {
    r.checkpoints += 1;
    r.lastCheckpointS = track.wrap(r.lastCheckpointS + seg);
    since -= seg;
    if (r.checkpoints % RACE.checkpoints === 0) crossLine(kart, time, finishedSoFar, emit);
  }
  r.since = since;
  r.progress = r.checkpoints * seg + Math.max(-seg, Math.min(seg, since));
  // Far past the next checkpoint without passing it, or far back behind the last: put it back.
  return !r.finished && (since > seg * 1.4 || since < -seg * 1.5) ? "lost" : "ok";
}

/**
 * A kart put back on the far side of a jump it missed may land past a
 * checkpoint it never drove through. It is credited with it, since the
 * game moved it there, not the driver.
 */
export function creditRespawn(kart: Kart, track: Track, time: number, finishedSoFar: number, emit: Emit): void {
  const r = kart.race;
  const seg = checkpointSpacing(track);
  let since = track.forward(r.lastCheckpointS, kart.loc.s);
  while (!r.finished && since >= seg && since < seg * 1.4) {
    r.checkpoints += 1;
    r.lastCheckpointS = track.wrap(r.lastCheckpointS + seg);
    since -= seg;
    if (r.checkpoints % RACE.checkpoints === 0) crossLine(kart, time, finishedSoFar, emit);
  }
  r.since = since;
}

function crossLine(kart: Kart, time: number, finishedSoFar: number, emit: Emit): void {
  const done = lapsDone(kart);
  if (done >= RACE.laps) {
    kart.race.finished = true;
    kart.race.finishTime = time;
    kart.race.place = finishedSoFar + 1;
    emit({ type: "finish", kart: kart.id, place: kart.race.place });
    return;
  }
  emit({ type: "lap", kart: kart.id, lap: done + 1 });
  if (done + 1 === RACE.laps) emit({ type: "finalLap", kart: kart.id });
}

/** Facing back down the track at speed for a moment shows the warning. */
export function updateWrongWay(kart: Kart, track: Track, dt: number): void {
  const f = track.frameAt(kart.loc.s);
  const facing = Math.sin(kart.heading) * f.tx + Math.cos(kart.heading) * f.tz;
  const backwards = facing < -0.3 && speedOf(kart) > 3 && !kart.race.finished;
  kart.race.wrongWayTime = backwards ? kart.race.wrongWayTime + dt : Math.max(0, kart.race.wrongWayTime - dt * 2);
  if (kart.race.wrongWayTime > RACE.wrongWayAfter) kart.race.wrongWay = true;
  else if (kart.race.wrongWayTime === 0) kart.race.wrongWay = false;
}

/**
 * Seconds spent trying to get on without getting anywhere. Wedged on a
 * barrier, beached, or bouncing off the same obstacle again and again,
 * the kart is put back on the road. Measured by progress along the lap
 * rather than speed, so bouncing about in one spot still counts.
 */
export function updateStuck(kart: Kart, trying: boolean, dt: number): boolean {
  const r = kart.race;
  if (!trying || r.finished || kart.timers.stun > 0 || r.progress > r.stallFrom + 4) {
    r.stuckTime = 0;
    r.stallFrom = r.progress;
    return false;
  }
  r.stuckTime += dt;
  return r.stuckTime > RACE.stuckAfter;
}

/** Remembers where the kart last had its wheels safely on the road. */
export function updateSafeSpot(kart: Kart, track: Track): void {
  if (kart.airborne || kart.surface !== "road" || kart.timers.stun > 0) return;
  const s = kart.loc.s;
  if (track.inGap(s) || track.rampHeight(s) > 0 || track.inGap(s + 12)) return;
  kart.race.safeS = s;
  kart.race.safeD = Math.max(-track.halfWidth + 2, Math.min(track.halfWidth - 2, kart.loc.d));
}

/** Finishers first in the order they crossed, then everyone else by distance. */
export function rank(karts: readonly Kart[]): Kart[] {
  const order = [...karts].sort((a, b) => {
    if (a.race.finished !== b.race.finished) return a.race.finished ? -1 : 1;
    if (a.race.finished) return (a.race.finishTime ?? 0) - (b.race.finishTime ?? 0) || a.race.place - b.race.place;
    return b.race.progress - a.race.progress;
  });
  order.forEach((kart, i) => (kart.race.place = i + 1));
  return order;
}
