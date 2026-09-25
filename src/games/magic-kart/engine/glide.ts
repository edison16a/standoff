import { baseTop } from "./drive";
import type { Emit } from "./events";
import { speedOf, type Kart } from "./kart";
import type { Track } from "./track";
import { DRIVE, GLIDE } from "./tuning";

/** Where the kart would come down: the ground under it, or the road level across a gap or off a lip. */
function floorAt(track: Track, s: number, d: number): number {
  return track.groundAt(s, d) ?? track.frameAt(s).y;
}

/**
 * Seconds until the kart would touch down on gravity alone, from its
 * height and how fast it is climbing. The lower of the floor under it
 * and the floor a little ahead counts, so a lip over a gap or a drop
 * down a hillside counts in full.
 */
export function airLeft(kart: Kart, track: Track): number {
  const ahead = track.wrap(kart.loc.s + speedOf(kart) * 0.4);
  const floor = Math.min(floorAt(track, kart.loc.s, kart.loc.d), floorAt(track, ahead, kart.loc.d));
  const height = kart.y - floor;
  if (height <= 0) return 0;
  const g = DRIVE.gravity;
  return (kart.vy + Math.sqrt(kart.vy * kart.vy + 2 * g * height)) / g;
}

/**
 * Whether the glider should open. Only on a real jump: off the ground a
 * moment, with enough flight in total to be worth it. A bump, a crest or
 * the short drop back in after a respawn never opens it.
 */
export function shouldDeploy(kart: Kart, track: Track): boolean {
  if (!kart.airborne || kart.gliding || kart.airTime < GLIDE.after) return false;
  return kart.airTime + airLeft(kart, track) >= GLIDE.minAir;
}

/** Opens the glider over a jump and folds it on landing, easing it in and out over a few tenths. */
export function updateGlide(kart: Kart, track: Track, dt: number, emit: Emit): void {
  if (shouldDeploy(kart, track)) {
    kart.gliding = true;
    emit({ type: "glide", kart: kart.id, open: true });
  } else if (kart.gliding && !kart.airborne) {
    kart.gliding = false;
    emit({ type: "glide", kart: kart.id, open: false });
  }
  kart.glide = kart.gliding ? Math.min(1, kart.glide + dt / GLIDE.unfold) : Math.max(0, kart.glide - dt / GLIDE.fold);
}

/**
 * Climb rate after one step in the air. With the glider open, gravity
 * pulls far less and the wing lifts a little more the faster it flies,
 * and a steady sink rate caps the fall, eased in so opening mid drop
 * does not jolt.
 */
export function airVy(kart: Kart, dt: number): number {
  const open = kart.glide;
  const pace = Math.min(1, speedOf(kart) / DRIVE.topSpeed);
  const pull = DRIVE.gravity * (1 - (1 - GLIDE.gravity) * open) - GLIDE.lift * open * pace;
  let vy = kart.vy - pull * dt;
  const cap = GLIDE.sink + (1 - open) * 14;
  // Past the sink rate the wing takes over from gravity and eases the fall back to it.
  if (open > 0 && vy < -cap) vy = Math.min(-cap, kart.vy + (-cap - kart.vy) * Math.min(1, dt * 6));
  return vy;
}

/** How far the glider turns the kart this step. The same steering as on the road, a touch gentler. */
export function glideTurn(kart: Kart, dt: number): number {
  return kart.steer * DRIVE.turnRate * GLIDE.turn * kart.stats.handling * kart.glide * dt;
}

/** Sideways grip in the air: none on a plain jump, a soft pull into the new heading under the wing. */
export function airGrip(kart: Kart): number {
  return GLIDE.grip * kart.glide;
}

/** Airspeed: a boost carried into the jump eases back to a steady cruise, which then only fades slowly. */
export function airSpeed(kart: Kart, vF: number, dt: number): number {
  if (!kart.gliding) return vF * Math.exp(-0.05 * dt);
  const cruise = baseTop(kart) * GLIDE.cruise;
  return vF > cruise ? vF - (vF - cruise) * GLIDE.drag * dt : vF * Math.exp(-0.05 * dt);
}
