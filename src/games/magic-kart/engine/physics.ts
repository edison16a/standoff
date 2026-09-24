import type { Emit } from "./events";
import type { Kart, KartInput } from "./kart";
import { KERB_WIDTH, type Track } from "./track";
import { DRIFT, DRIVE, EFFECTS } from "./tuning";

/** The kart's top speed right now, from its stats, the surface and any effect on it. */
export function topSpeed(kart: Kart): number {
  const base = DRIVE.topSpeed * kart.stats.speed * kart.speedBias;
  // A boost carries you across sand at full pace, which is half its point.
  if (kart.timers.boost > 0) return base * EFFECTS.boostFactor;
  let top = base;
  if (kart.surface === "offroad") top *= DRIVE.offroadFactor;
  else if (kart.surface === "kerb") top *= DRIVE.kerbFactor;
  if (kart.timers.ice > 0) top *= EFFECTS.iceFactor;
  return top;
}

/** Speed along the nose after this step's pedals. */
function pedals(kart: Kart, input: KartInput, vF: number, top: number, dt: number): number {
  if (kart.timers.stun > 0) return vF * Math.exp(-2.6 * dt);
  if (kart.timers.boost > 0) return Math.max(vF, Math.min(top, vF + 55 * dt));
  const driving = kart.drift !== 0 || (input.throttle && !input.brake);
  if (driving) {
    // Pressing Drive while rolling backwards stops the kart first, quickly.
    if (vF < 0) return Math.min(0, vF + DRIVE.brake * dt);
    const gain = DRIVE.accel * kart.stats.accel * (1.15 - Math.max(0, vF) / top);
    const next = vF < top ? Math.min(top, vF + gain * dt) : vF;
    return next > top ? Math.max(top, next - ((next - top) * 2.2 + 4) * dt) : next;
  }
  if (input.brake) {
    if (vF > 0.5) return Math.max(0, vF - DRIVE.brake * dt);
    return Math.max(-DRIVE.reverseSpeed, vF - DRIVE.accel * 0.6 * dt);
  }
  const slowed = vF - Math.sign(vF) * Math.min(Math.abs(vF), DRIVE.coast * dt);
  return slowed > top ? Math.max(top, slowed - (slowed - top) * 2.2 * dt) : slowed;
}

/** Starts, holds and releases a drift. Letting go after a long one fires a mini boost. */
function updateDrift(kart: Kart, input: KartInput, vF: number, control: boolean, dt: number, emit: Emit): void {
  const fast = vF > DRIVE.topSpeed * DRIFT.minSpeed;
  if (kart.drift === 0) {
    if (control && fast && input.brake && Math.abs(input.steer) > 0.35) {
      kart.drift = Math.sign(input.steer);
      kart.driftTime = 0;
      emit({ type: "drift", kart: kart.id, on: true });
    }
    return;
  }
  const keep = control && input.brake && vF > DRIVE.topSpeed * 0.3;
  if (keep) {
    kart.driftTime += dt * (0.7 + 0.5 * Math.abs(input.steer));
    return;
  }
  const charge = kart.driftTime;
  kart.drift = 0;
  kart.driftTime = 0;
  emit({ type: "drift", kart: kart.id, on: false });
  if (!control) return;
  const boost = charge >= DRIFT.orangeAt ? DRIFT.orangeBoost : charge >= DRIFT.blueAt ? DRIFT.blueBoost : 0;
  if (boost > 0) {
    kart.timers.boost = Math.max(kart.timers.boost, boost);
    emit({ type: "boost", kart: kart.id, source: "drift" });
  }
}

/**
 * One physics step for one kart: pedals, steering, grip, then the track
 * pushing back. Arcade on purpose. Velocity splits into a part along the
 * nose and a sideways slide that grip bleeds away, and drifting or ice
 * simply lowers the grip, which is what makes a kart feel slippery.
 */
export function driveKart(kart: Kart, input: KartInput, track: Track, dt: number, emit: Emit): void {
  const fx = Math.sin(kart.heading);
  const fz = Math.cos(kart.heading);
  let vF = kart.vx * fx + kart.vz * fz;
  let vR = kart.vx * -fz + kart.vz * fx;
  const stunned = kart.timers.stun > 0;
  const control = !stunned && !kart.airborne;
  const top = topSpeed(kart);

  kart.throttle = control && input.throttle;
  if (!kart.airborne) vF = pedals(kart, input, vF, top, dt);
  updateDrift(kart, input, vF, control, dt, emit);

  const wanted = control ? input.steer : 0;
  kart.steer += (wanted - kart.steer) * Math.min(1, dt * 12);
  if (control) {
    const turn = kart.drift !== 0 ? kart.drift * (0.72 + 0.45 * kart.steer * kart.drift) : kart.steer;
    const fade = Math.min(1, Math.abs(vF) / DRIVE.steerFullAt);
    const ease = 1 - 0.22 * Math.min(1, Math.abs(vF) / (DRIVE.topSpeed * 1.3));
    const ice = kart.timers.ice > 0 ? 0.8 : 1;
    kart.heading -= turn * DRIVE.turnRate * kart.stats.handling * fade * ease * ice * Math.sign(vF || 1) * dt;
  }

  const grip = kart.airborne ? 0 : kart.timers.ice > 0 ? DRIVE.iceGrip : kart.drift !== 0 ? DRIVE.driftGrip : stunned ? 2 : DRIVE.grip;
  vR *= Math.exp(-grip * dt);
  if (kart.airborne) vF *= Math.exp(-0.05 * dt);

  const nx = Math.sin(kart.heading);
  const nz = Math.cos(kart.heading);
  kart.vx = nx * vF - nz * vR;
  kart.vz = nz * vF + nx * vR;
  kart.x += kart.vx * dt;
  kart.z += kart.vz * dt;
  if (stunned) kart.spin += dt * 14 * Math.min(1, kart.timers.stun + 0.3);
  else kart.spin = 0;

  settleOnTrack(kart, track, vF, dt, emit);
}

/** Finds the kart on the track, keeps it inside the barriers and on the ground. */
function settleOnTrack(kart: Kart, track: Track, vF: number, dt: number, emit: Emit): void {
  const loc = track.locate(kart.x, kart.z, kart.loc.index);
  const side = Math.sign(loc.d) || 1;
  const off = Math.abs(loc.d);
  const limit = track.edge - DRIVE.radius;
  if (off > limit && track.hasWall(loc.s, side)) {
    const f = track.frameAt(loc.s);
    const push = off - limit;
    kart.x -= f.rx * side * push;
    kart.z -= f.rz * side * push;
    const outward = (kart.vx * f.rx + kart.vz * f.rz) * side;
    if (outward > 0) {
      kart.vx -= f.rx * side * outward * 1.35;
      kart.vz -= f.rz * side * outward * 1.35;
      kart.vx *= 0.94;
      kart.vz *= 0.94;
      if (outward > 3) emit({ type: "bump", kart: kart.id, strength: Math.min(1, outward / 15) });
    }
    loc.d = side * limit;
  }
  kart.loc = loc;
  const d = Math.abs(loc.d);
  kart.surface = d <= track.halfWidth ? "road" : d <= track.halfWidth + KERB_WIDTH ? "kerb" : "offroad";

  const ground = track.groundAt(loc.s, loc.d);
  if (!kart.airborne) {
    const follow = Math.abs(vF) * dt * 0.9 + 0.03;
    if (ground !== null && ground >= kart.y - follow) {
      kart.vy = Math.max(-20, Math.min(15, (ground - kart.y) / dt));
      kart.y = ground;
      return;
    }
    kart.airborne = true;
    kart.airTime = 0;
    // Off a ramp lip the kart is still climbing; rolling off an edge it is not.
    if (kart.vy > 0.5) emit({ type: "jump", kart: kart.id });
    return;
  }
  kart.airTime += dt;
  kart.vy -= DRIVE.gravity * dt;
  kart.y += kart.vy * dt;
  // Only land from above. A kart that fell past the lip keeps falling.
  if (ground !== null && kart.y <= ground && kart.y > ground - 1.2) {
    kart.y = ground;
    kart.vy = 0;
    kart.airborne = false;
    if (kart.airTime > 0.25) emit({ type: "land", kart: kart.id, airTime: kart.airTime });
  }
}
