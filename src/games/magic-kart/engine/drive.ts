import type { Emit } from "./events";
import type { Kart, KartInput } from "./kart";
import { DRIFT, DRIVE, SURGE } from "./tuning";

/** The kart's top speed from its stats and the computer's nudge, before surface, effects or surge. */
export function baseTop(kart: Kart): number {
  return DRIVE.topSpeed * kart.stats.speed * kart.speedBias;
}

/** How charged a drift is: 0 none yet, then 1 blue, 2 orange and 3 purple sparks. */
export function driftTier(driftTime: number): 0 | 1 | 2 | 3 {
  return driftTime >= DRIFT.purpleAt ? 3 : driftTime >= DRIFT.orangeAt ? 2 : driftTime >= DRIFT.blueAt ? 1 : 0;
}

const TURBO = [0, DRIFT.blueBoost, DRIFT.orangeBoost, DRIFT.purpleBoost] as const;

/**
 * Speed along the nose after this step's pedals. Drive builds speed
 * over a few seconds, quick at first and easing off near the top. Brake
 * bites softly at first and harder the longer it is held, so a tap only
 * trims speed. In a drift the kart glides: Drive keeps it near full pace,
 * and without it the slide slowly bleeds speed.
 */
export function pedals(kart: Kart, input: KartInput, vF: number, top: number, dt: number): number {
  if (kart.timers.stun > 0) return vF * Math.exp(-2.6 * dt);
  if (kart.timers.boost > 0) return Math.max(vF, Math.min(top, vF + 55 * dt));
  if (kart.drift !== 0) {
    // Both thumbs down is the power slide most players will use: it holds the pace.
    if (input.throttle) return towards(vF, top * DRIFT.powerTop, DRIVE.accel * 0.5 * dt, dt);
    return Math.max(0, vF - (input.brake ? DRIFT.brakeGlide : DRIFT.glide) * dt);
  }
  if (input.throttle && !input.brake) {
    // Pressing Drive while rolling backwards stops the kart first, quickly.
    if (vF < 0) return Math.min(0, vF + DRIVE.brake * dt);
    const gain = DRIVE.accel * kart.stats.accel * (DRIVE.accelCurve - Math.max(0, vF) / top);
    return towards(vF, top, gain * dt, dt);
  }
  if (input.brake) {
    if (vF > 0.5) {
      const bite = DRIVE.brakeBite + (1 - DRIVE.brakeBite) * Math.min(1, kart.brakeHeld / DRIVE.brakeRamp);
      return Math.max(0, vF - DRIVE.brake * bite * dt);
    }
    return Math.max(-DRIVE.reverseSpeed, vF - DRIVE.accel * 0.6 * dt);
  }
  const slowed = vF - Math.sign(vF) * Math.min(Math.abs(vF), DRIVE.coast * dt);
  return slowed > top ? Math.max(top, slowed - (slowed - top) * 2.2 * dt) : slowed;
}

/** Climbs by `gain` up to `top`, and eases back down when above it, as after a boost. */
function towards(vF: number, top: number, gain: number, dt: number): number {
  if (vF <= top) return Math.min(top, vF + Math.max(0, gain));
  return Math.max(top, vF - ((vF - top) * 2.2 + 4) * dt);
}

/**
 * Holding Drive flat out for a few seconds lifts the top speed a notch.
 * Lifting off or braking lets it fade, and a drift with Drive held keeps
 * it, so a good line through a bend holds on to the extra pace.
 */
export function updateSurge(kart: Kart, input: KartInput, vF: number, dt: number): void {
  const flat = input.throttle && !input.brake && kart.timers.stun <= 0;
  if (!flat) kart.flatOut = 0;
  else if (kart.drift === 0 && kart.surface !== "offroad" && vF > baseTop(kart) * SURGE.from) kart.flatOut += dt;
  const target = Math.max(0, Math.min(1, (kart.flatOut - SURGE.after) / SURGE.build));
  kart.surge = target >= kart.surge ? target : Math.max(target, kart.surge - SURGE.fade * dt);
}

/** Whether this step's pedals and steering start a drift: braking into a bend, or lifting off hard in one. */
function startsDrift(kart: Kart, input: KartInput, vF: number): boolean {
  const top = baseTop(kart);
  const steer = Math.abs(input.steer);
  if (input.brake) return vF > top * DRIFT.minSpeed && steer > DRIFT.brakeSteer;
  return !input.throttle && vF > top * DRIFT.liftSpeed && steer > DRIFT.liftSteer;
}

/**
 * Starts, holds and releases a drift. It lasts while Brake is held or
 * Drive is off, and ends when the player drives out of it or the kart
 * has slowed right down. The longer the slide, and the faster, the
 * hotter the sparks, and the turbo it pays when it ends.
 */
export function updateDrift(kart: Kart, input: KartInput, vF: number, control: boolean, dt: number, emit: Emit): void {
  if (kart.drift === 0) {
    if (control && startsDrift(kart, input, vF)) {
      kart.drift = Math.sign(input.steer);
      kart.driftTime = 0;
      emit({ type: "drift", kart: kart.id, on: true });
    }
    return;
  }
  const keep = control && (input.brake || !input.throttle) && vF > baseTop(kart) * DRIFT.keepSpeed;
  if (keep) {
    const pace = Math.max(0, Math.min(1.3, vF / baseTop(kart)));
    kart.driftTime += dt * (0.7 + 0.5 * Math.abs(input.steer)) * (0.5 + 0.6 * pace);
    return;
  }
  const tier = driftTier(kart.driftTime);
  kart.drift = 0;
  kart.driftTime = 0;
  emit({ type: "drift", kart: kart.id, on: false });
  if (!control || tier === 0) return;
  kart.timers.boost = Math.max(kart.timers.boost, TURBO[tier]);
  emit({ type: "boost", kart: kart.id, source: "drift" });
}

/**
 * Sideways grip. A drift lets the kart slide, and the faster it goes the
 * less the tyres hold, so a quick kart swings wider through the bend.
 */
export function gripOf(kart: Kart, vF: number): number {
  if (kart.airborne) return 0;
  if (kart.timers.ice > 0) return DRIVE.iceGrip;
  if (kart.drift !== 0) return DRIVE.driftGrip * (1 - DRIFT.wide * Math.min(1.2, Math.max(0, vF) / baseTop(kart)));
  return kart.timers.stun > 0 ? 2 : DRIVE.grip;
}
