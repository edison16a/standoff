import type { Pose } from "./pose";

/**
 * The runner's key poses, each written into a Pose. `phase` is the
 * stride in radians: one full turn is a left and a right step.
 */

/**
 * A cartoon sprint: long strides with the knee of the swinging leg folding
 * high, a push off the toes behind, arms pumping against the legs, the
 * body leaning in and bouncing twice a stride, lowest as each foot lands.
 */
export function runPose(p: Pose, phase: number, effort = 1): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const reach = 0.85 * effort;
  // A leg swings forward while cos is positive for the left; the knee folds most mid swing.
  const foldL = Math.pow(Math.max(0, c), 0.7);
  const foldR = Math.pow(Math.max(0, -c), 0.7);
  p.clear();
  p.set("hipL", 0.2 + reach * s).set("hipR", 0.2 - reach * s);
  p.set("kneeL", -0.25 - 1.55 * foldL * effort - 0.2 * Math.max(0, -c)).set("kneeR", -0.25 - 1.55 * foldR * effort - 0.2 * Math.max(0, c));
  // Toes point down on the push off behind, and flex up as the foot reaches forward to land.
  p.set("ankleL", -0.15 + 0.4 * s).set("ankleR", -0.15 - 0.4 * s);
  p.set("shoulderL", -0.95 * s * effort, 0, -0.14).set("shoulderR", 0.95 * s * effort, 0, 0.14);
  p.set("elbowL", 1.45 + 0.35 * s).set("elbowR", 1.45 - 0.35 * s);
  p.set("hips", 0, -0.2 * s, 0.07 * s);
  p.set("spine", -0.26, 0.22 * s).set("chest", -0.05, 0.1 * s).set("neck", 0.14).set("head", 0.06 + 0.04 * Math.abs(c), -0.24 * s);
  p.lift = -0.07 + 0.1 * Math.abs(c) * effort;
  return p;
}

/**
 * Knocked sideways off a train: the body jolts away from the hit, the
 * arm on that side flies up, the knees buckle and the head whips round.
 * `side` is where the train was, 1 on the right. `t` is seconds since.
 */
export function stumblePose(p: Pose, side: number, t: number): Pose {
  const jolt = Math.min(1, t / 0.08) * Math.exp(-t * 3);
  const wobble = Math.sin(t * 24) * Math.exp(-t * 5);
  p.clear();
  p.set("spine", -0.45 * jolt, 0.3 * side * jolt, side * 0.5 * jolt + 0.1 * wobble).set("chest", -0.1, 0, side * 0.2 * jolt);
  p.set("neck", 0.2 * jolt, 0, -side * 0.3 * jolt).set("head", 0.15 * jolt, -side * 0.4 * jolt + 0.2 * wobble, 0);
  p.set(side > 0 ? "shoulderR" : "shoulderL", 2.3 * jolt, 0, side * (1.1 + 0.3 * wobble) * jolt);
  p.set(side > 0 ? "shoulderL" : "shoulderR", 0.9 * jolt, 0, -side * 0.9 * jolt);
  p.set("elbowL", 0.7).set("elbowR", 0.7);
  p.set("hipL", 0.7 * jolt).set("hipR", -0.3 * jolt);
  p.set("kneeL", -1.3 * jolt).set("kneeR", -0.5 * jolt);
  p.lift = -0.16 * jolt;
  return p;
}

/** In the air: knees tucked, arms flung up. `rise` is 1 going up and -1 coming down. */
export function jumpPose(p: Pose, rise: number): Pose {
  const up = Math.max(0, rise);
  const down = Math.max(0, -rise);
  p.clear();
  p.set("hipL", 1.2 - 0.5 * down).set("hipR", 0.35 + 0.3 * down);
  p.set("kneeL", -1.9 + 0.6 * down).set("kneeR", -1.2 + 0.3 * down);
  p.set("ankleL", 0.4).set("ankleR", 0.5);
  p.set("shoulderL", 2.3 * up + 0.9 * down, 0, -0.5 - 0.5 * down).set("shoulderR", 1.6 * up + 0.6 * down, 0, 0.5 + 0.5 * down);
  p.set("elbowL", 0.5).set("elbowR", 0.7);
  p.set("spine", -0.15).set("neck", -0.1 * up).set("head", -0.15 * up + 0.1 * down);
  p.lift = 0.05;
  return p;
}

/** Tucked into a ball for a roll. The spin itself is added on the pivot. */
export function rollPose(p: Pose): Pose {
  p.clear();
  p.set("hipL", 2.3).set("hipR", 2.3);
  p.set("kneeL", -2.5).set("kneeR", -2.5);
  p.set("shoulderL", 1.3, 0, 0.3).set("shoulderR", 1.3, 0, -0.3);
  p.set("elbowL", 1.9).set("elbowR", 1.9);
  p.set("spine", -0.85).set("chest", -0.4).set("neck", -0.5).set("head", -0.45);
  p.lift = -0.42;
  return p;
}

/** Riding a hoverboard: a wide surfer's crouch, arms out for balance. */
export function boardPose(p: Pose, time: number): Pose {
  const sway = Math.sin(time * 3.1);
  p.clear();
  p.set("hips", 0, -0.55 + 0.08 * sway);
  p.set("hipL", 0.55, 0, -0.18).set("hipR", -0.15, 0, 0.18);
  p.set("kneeL", -0.95).set("kneeR", -0.6);
  p.set("ankleL", 0.4).set("ankleR", 0.3);
  p.set("spine", -0.2, 0.45).set("chest", 0, 0.1).set("neck", 0, -0.55).set("head", 0.05, -0.2);
  p.set("shoulderL", 0.3, 0, -1.1 - 0.15 * sway).set("shoulderR", -0.2, 0, 1.0 + 0.15 * sway);
  p.set("elbowL", 0.4).set("elbowR", 0.5);
  p.lift = -0.14;
  return p;
}

/** Flying a jetpack: stretched out like a superhero, legs trailing. */
export function flyPose(p: Pose, time: number): Pose {
  const kick = Math.sin(time * 9);
  p.clear();
  p.set("spine", -0.9).set("chest", -0.2).set("neck", 0.7).set("head", 0.3);
  p.set("hipL", -0.35 + 0.15 * kick).set("hipR", -0.25 - 0.15 * kick);
  p.set("kneeL", -0.5).set("kneeR", -0.3);
  p.set("shoulderL", 2.6, 0, -0.25).set("shoulderR", 0.3, 0, 0.5);
  p.set("elbowL", 0.2).set("elbowR", 1.0);
  return p;
}

/** Knocked flat: thrown back off whatever they hit, arms and legs splayed. `t` is seconds since. */
export function crashPose(p: Pose, t: number): Pose {
  const hit = Math.min(1, t / 0.18);
  const flop = Math.min(1, Math.max(0, (t - 0.1) / 0.5));
  const wobble = Math.sin(t * 16) * Math.exp(-t * 3);
  p.clear();
  p.set("spine", 0.35 * hit, 0, 0.1 * wobble).set("neck", 0.4 * hit).set("head", 0.3 * hit + 0.2 * wobble);
  p.set("shoulderL", 0.6 * hit, 0, -1.6 * hit - 0.3 * wobble).set("shoulderR", 0.9 * hit, 0, 1.4 * hit + 0.3 * wobble);
  p.set("elbowL", 0.6).set("elbowR", 0.9);
  p.set("hipL", 1.1 * hit + 0.3 * wobble, 0, -0.3).set("hipR", 0.4 * hit, 0, 0.35);
  p.set("kneeL", -0.9 * hit).set("kneeR", -0.3);
  p.lift = -0.25 * flop;
  return p;
}

/** Standing ready, breathing, with a small bounce: the lobby and the tutorial. */
export function idlePose(p: Pose, time: number): Pose {
  const breathe = Math.sin(time * 2.2);
  const bounce = Math.abs(Math.sin(time * 4.4));
  p.clear();
  p.set("spine", -0.05 + 0.02 * breathe).set("chest", 0.02 * breathe).set("head", 0.05, 0.15 * Math.sin(time * 0.7));
  p.set("shoulderL", 0.15, 0, -0.18).set("shoulderR", 0.15, 0, 0.18);
  p.set("elbowL", 0.5).set("elbowR", 0.5);
  p.set("hipL", 0.12, 0, -0.06).set("hipR", 0.12, 0, 0.06);
  p.set("kneeL", -0.25 - 0.1 * bounce).set("kneeR", -0.25 - 0.1 * bounce);
  p.set("ankleL", 0.12).set("ankleR", 0.12);
  p.lift = -0.03 - 0.02 * bounce;
  return p;
}

/** Arms up in triumph, bouncing on the spot, for the winner. */
export function cheerPose(p: Pose, time: number): Pose {
  const hop = Math.abs(Math.sin(time * 6));
  const wave = Math.sin(time * 12);
  p.clear();
  p.set("spine", 0.08).set("neck", -0.2).set("head", -0.1);
  p.set("shoulderL", 2.9, 0, -0.35 + 0.15 * wave).set("shoulderR", 2.9, 0, 0.35 - 0.15 * wave);
  p.set("elbowL", 0.3).set("elbowR", 0.3);
  p.set("hipL", 0.2 + 0.3 * hop).set("hipR", 0.2 + 0.3 * hop);
  p.set("kneeL", -0.4 - 0.6 * hop).set("kneeR", -0.4 - 0.6 * hop);
  p.lift = 0.18 * hop - 0.05;
  return p;
}
