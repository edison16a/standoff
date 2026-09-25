import { isBoss, KINDS } from "../../../engine/zombie-kinds";
import type { Zombie } from "../../../engine/zombie";
import type { Rig } from "./rig";

const TAU = Math.PI * 2;
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
/** A fall that lands and bounces once, like dead weight. */
const thud = (t: number) => {
  if (t >= 1) return 1;
  if (t < 0.72) return (t / 0.72) ** 2;
  const k = (t - 0.72) / 0.28;
  return 1 - Math.sin(k * Math.PI) * 0.08;
};

interface Gait {
  stride: number;
  lean: number;
  cadence: number;
}

const GAITS: Record<string, Gait> = {
  walker: { stride: 0.36, lean: 0.14, cadence: 2.4 },
  runner: { stride: 0.78, lean: 0.42, cadence: 2.1 },
  brute: { stride: 0.3, lean: 0.2, cadence: 2.2 },
  armored: { stride: 0.34, lean: 0.12, cadence: 2.4 },
  boss: { stride: 0.26, lean: 0.24, cadence: 2.6 },
};

/**
 * Poses a zombie's joints for this frame from its state: a shambling
 * limp with arms reaching for the team, a sprint for runners, a heavy
 * overhead swing in reach, a jolt when hit, and a dead fall backwards.
 * `flinch` (0 to 1) adds a quick recoil from the latest bullet.
 */
export function poseZombie(rig: Rig, z: Zombie, flinch: number): void {
  const b = rig.bones;
  const boss = isBoss(z.kind);
  const gait = GAITS[boss ? "boss" : z.kind] ?? GAITS.walker!;
  const t = z.age;
  const seed = z.seed;
  const limp = seed > 0.55 ? 0.55 : 1;
  const phase = t * z.speed * gait.cadence * TAU * (z.state === "walk" ? 1 : 0.15) + seed * 10;
  const s = Math.sin(phase);
  const c = Math.cos(phase);

  // Legs: stride, knee bend on the swing, flat feet.
  const stride = gait.stride;
  b.hipL.rotation.set(-s * stride, 0, 0.03);
  b.hipR.rotation.set(s * stride * limp, 0, -0.03);
  b.kneeL.rotation.x = Math.max(0, -c) * stride * 1.4 + 0.05;
  b.kneeR.rotation.x = Math.max(0, c) * stride * 1.4 * limp + 0.05;
  b.ankleL.rotation.x = -(b.hipL.rotation.x + b.kneeL.rotation.x) * 0.7;
  b.ankleR.rotation.x = -(b.hipR.rotation.x + b.kneeR.rotation.x) * 0.7;
  b.hips.position.y = rig.dims.thigh + rig.dims.shin + rig.dims.foot - 0.02 + Math.abs(c) * 0.03 - (boss ? 0.04 : 0);
  b.hips.rotation.set(0, s * 0.1, s * 0.04 * (2 - limp));

  // Torso and head: hunched, swaying, the head lolling on a slack neck.
  b.spine.rotation.set(gait.lean + seed * 0.12, -s * 0.08, s * 0.07 + (seed - 0.5) * 0.12);
  b.neck.rotation.set(boss ? 0.15 : -0.1, 0, 0);
  b.head.rotation.set(-0.05 + Math.sin(t * 0.8 + seed * 5) * 0.08, Math.sin(t * 0.5 + seed * 3) * 0.2, Math.sin(t * 0.9 + seed * 7) * 0.14 + (seed - 0.5) * 0.4);
  b.jaw.rotation.x = 0.12 + Math.max(0, Math.sin(t * 2.2 + seed * 9)) * 0.45;

  // Arms: reaching for the team, a stiff weave in the hands.
  const reach = boss ? 0.45 : z.kind === "runner" ? 0.7 : 1.4 + seed * 0.25;
  const dangle = !boss && seed < 0.25;
  b.shoulderL.rotation.set(-reach + Math.sin(phase * 0.5 + 1) * 0.12, 0, 0.16);
  b.shoulderR.rotation.set(dangle ? -0.15 + s * 0.25 : -reach + Math.sin(phase * 0.5) * 0.12, 0, -0.16);
  b.elbowL.rotation.set(-0.25, 0, 0);
  b.elbowR.rotation.set(dangle ? -0.1 : -0.25, 0, 0);
  if (z.kind === "runner" && z.state === "walk") {
    b.shoulderL.rotation.x = -0.4 + s * 1.1;
    b.shoulderR.rotation.x = -0.4 - s * 1.1;
    b.elbowL.rotation.x = b.elbowR.rotation.x = -1.1;
  }
  if (boss) {
    b.shoulderL.rotation.x = -0.35 + s * 0.3;
    b.shoulderR.rotation.x = -0.35 - s * 0.3;
    b.elbowL.rotation.x = b.elbowR.rotation.x = -0.45;
  }

  if (z.state === "attack") swing(rig, z, boss);
  if (z.state === "stagger") {
    const k = Math.sin(Math.min(1, z.stateTime / KINDS[z.kind].stagger) * Math.PI);
    b.spine.rotation.x -= k * (boss ? 0.5 : 0.7);
    b.head.rotation.x -= k * 0.6;
    b.shoulderL.rotation.x -= k * 0.6;
    b.shoulderR.rotation.x -= k * 0.5;
  }
  if (flinch > 0) {
    b.spine.rotation.x -= flinch * 0.25;
    b.head.rotation.z += flinch * 0.3 * (seed > 0.5 ? 1 : -1);
  }
  rig.body.rotation.x = 0;
  rig.body.position.y = 0;
  if (z.state === "dead") fall(rig, z);
}

/** Arms up over the head, then down onto the team as the swing lands. */
function swing(rig: Rig, z: Zombie, boss: boolean): void {
  const b = rig.bones;
  const every = KINDS[z.kind].attackEvery;
  const p = 1 - Math.max(0, z.swingIn) / every;
  const raise = ease((p - 0.45) / 0.4);
  const strike = p > 0.88 ? ease((p - 0.88) / 0.12) : 0;
  const recover = p < 0.2 ? 1 - p / 0.2 : 0;
  const up = -0.6 - raise * 2.1 + strike * 1.7 + recover * 0.4;
  b.shoulderL.rotation.x = up;
  b.shoulderR.rotation.x = up + (boss ? 0 : 0.2);
  b.elbowL.rotation.x = b.elbowR.rotation.x = -0.5 * raise;
  b.spine.rotation.x += -raise * 0.18 + strike * 0.45 + recover * 0.3;
  b.head.rotation.x += -raise * 0.2 + strike * 0.2;
  b.jaw.rotation.x = 0.2 + raise * 0.5;
}

/** Tips backwards from the feet and hits the ground, then sinks away. */
function fall(rig: Rig, z: Zombie): void {
  const b = rig.bones;
  const time = z.stateTime;
  const head = z.death?.head ?? false;
  const speed = head ? 0.55 : 0.8;
  const down = thud(time / speed);
  rig.body.rotation.x = (-Math.PI / 2) * down * 0.96;
  // Lying on its back, the body rests on its back rather than half in the road.
  rig.body.position.y = rig.dims.torsoD * 0.5 * down;
  // Arms fly up as it goes over, then drop flat above its head once it lands.
  const settle = ease((time - speed) / 0.35);
  // Set whole, so the lolling head of the walk stops with the body.
  b.head.rotation.set(head ? -0.9 : -0.3, (z.seed - 0.5) * 0.8, 0);
  b.jaw.rotation.x = 0.6;
  b.shoulderL.rotation.set(-2.6 - settle * 0.55, 0, 0.5 + settle * 0.3);
  b.shoulderR.rotation.set(-2.2 - settle * 0.95, 0, -0.7 - settle * 0.2);
  b.elbowL.rotation.x = b.elbowR.rotation.x = -0.2;
  // The legs are set whole, so no part of the walk keeps moving on a body.
  b.hips.rotation.set(0, 0, 0);
  b.hips.position.y = rig.dims.thigh + rig.dims.shin + rig.dims.foot - 0.02;
  b.hipL.rotation.set(-0.4 * ease(time / speed), 0, 0.08);
  b.hipR.rotation.set(-0.05, 0, -0.1);
  b.kneeL.rotation.x = 0.5 * ease(time / speed);
  b.kneeR.rotation.x = 0.2;
  b.ankleL.rotation.x = b.ankleR.rotation.x = 0.3;
  b.spine.rotation.set(0, 0, 0);
  if (time > 3.4) rig.body.position.y -= (time - 3.4) * 0.3;
}
