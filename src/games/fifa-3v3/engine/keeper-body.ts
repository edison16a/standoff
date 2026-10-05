import type { BallCollider } from "./ball";
import { diveLayout } from "./dive";
import { outward } from "./keeper";
import { KEEPER, STEP } from "./tuning";
import type { Keeper } from "./types";
import { clamp, lerp, type Vec3 } from "./vec";

/**
 * The keeper as the ball meets him: his gloves and the body behind them,
 * where they are this step and how they are moving. The dive puts them
 * on the line the keeper read, as fast as a dive can, so a save is the
 * ball meeting a glove, not a roll of the dice. Padded gloves soak up
 * pace; a strong wrist pushes the ball out of the goal.
 */
export const KEEPER_BODY = {
  gloveRadius: 0.11,
  bodyRadius: 0.2,
  gloveRestitution: 0.32,
  gloveFriction: 0.6,
  bodyRestitution: 0.45,
  bodyFriction: 0.4,
  /** The wrists push a ball out of the goal at this pace as it is palmed. */
  push: 2.6,
  /** The fastest ball a keeper on his feet gathers into his body, m/s. */
  smother: 18,
} as const;

/** Ids for the keepers' parts, kept apart from the outfield players' ids, which start at 0. */
export const keeperId = (k: Keeper) => -1 - k.team;

interface Pose {
  glove: Vec3;
  /** Along the arms, from the wrists to the fingertips, or across the body with the arms spread. */
  arm: Vec3;
  /** How far the hands reach back and on along `arm` from the glove point. */
  span: [number, number];
  feet: Vec3;
  head: Vec3;
}

/** Where the keeper's gloves, feet and head are `t` seconds into what he is doing. */
export function keeperPose(k: Keeper, t: number): Pose {
  const out = outward(k.team);
  const x = k.pos.x;
  const dive = k.dive;
  // Set, the hands are held out wide either side, palms to the ball.
  const set: Pose = {
    glove: { x: x + out * 0.32, y: 1.05, z: k.pos.z },
    arm: { x: 0, y: 0, z: 1 },
    span: [0.42, 0.42],
    feet: { x, y: 0.1, z: k.pos.z },
    head: { x, y: 1.78, z: k.pos.z },
  };
  if (k.action !== "dive" || !dive) return k.action === "getup" ? { ...set, head: { x, y: 1.2, z: k.pos.z } } : set;
  const u = clamp((t - dive.wait) / dive.duration, 0, 1);
  const e = 1 - (1 - u) * (1 - u);
  const fromZ = dive.fromZ;
  if (dive.standing) {
    // Hands together and angled to the ball, covering a little up and down as well as across.
    const glove = { x: x + out * 0.32, y: lerp(1.05, dive.height, e), z: lerp(fromZ, dive.gloveZ, e) };
    return { ...set, glove, arm: { x: 0, y: Math.SQRT1_2, z: dive.dir * Math.SQRT1_2 }, span: [0.22, 0.22] };
  }
  const layout = diveLayout(dive);
  const feetZ = lerp(fromZ, dive.toZ, e);
  const landed = t - dive.wait - dive.duration;
  const angle = layout.lean * e + (Math.PI / 2 - layout.lean) * clamp(landed / 0.25, 0, 1);
  const reach = lerp(1.25, layout.stretch, e);
  const lift = layout.leap * Math.sin((Math.PI / 2) * e) * (1 - clamp(landed / 0.25, 0, 1));
  const up = { y: Math.cos(angle), z: dive.dir * Math.sin(angle) };
  return {
    glove: { x: x + out * 0.12, y: Math.max(0.12, lift + up.y * reach), z: feetZ + up.z * reach },
    arm: { x: 0, y: up.y, z: up.z },
    span: [0.09, 0.13],
    feet: { x, y: Math.max(0.12, lift + 0.1), z: feetZ },
    head: { x, y: Math.max(0.15, lift + up.y * 1.6), z: feetZ + up.z * 1.6 },
  };
}

/**
 * The keeper's colliders for this step, moving at the speed his pose
 * changes. A keeper holding the ball has none. `grip` is the fastest
 * ball his gloves can hold in this pose (0 at full stretch: a palm only).
 */
export function keeperColliders(k: Keeper, holding: boolean, out: BallCollider[]): void {
  if (holding || k.action === "cheer" || k.action === "throw") return;
  const now = keeperPose(k, k.actionT);
  const next = keeperPose(k, k.actionT + STEP);
  const v = (a: Vec3, b: Vec3) => ({ x: (b.x - a.x) / STEP, y: (b.y - a.y) / STEP, z: (b.z - a.z) / STEP });
  const gloveVel = v(now.glove, next.glove);
  // The wrists drive the ball back out of the goal, and up over a high one.
  const push = KEEPER_BODY.push;
  gloveVel.x += outward(k.team) * push;
  gloveVel.y += now.glove.y > 1.9 ? push * 0.6 : 0;
  const [reachBack, reachOn] = now.span;
  out.push({
    id: keeperId(k),
    kind: "glove",
    shape: {
      a: { x: now.glove.x, y: now.glove.y - now.arm.y * reachBack, z: now.glove.z - now.arm.z * reachBack },
      b: { x: now.glove.x, y: now.glove.y + now.arm.y * reachOn, z: now.glove.z + now.arm.z * reachOn },
      radius: KEEPER_BODY.gloveRadius,
    },
    vel: gloveVel,
    restitution: KEEPER_BODY.gloveRestitution,
    friction: KEEPER_BODY.gloveFriction,
    grip: k.grip,
  });
  out.push({
    id: keeperId(k),
    kind: "body",
    shape: { a: now.feet, b: now.head, radius: KEEPER_BODY.bodyRadius },
    vel: v(now.feet, next.feet),
    restitution: KEEPER_BODY.bodyRestitution,
    friction: KEEPER_BODY.bodyFriction,
    // On his feet, a soft ball into the body is gathered against the chest.
    grip: k.action === "set" || k.dive?.standing ? KEEPER_BODY.smother : undefined,
  });
}

/**
 * How far across a keeper can get his gloves to a ball arriving after
 * `t` seconds, having reacted `react` seconds in: a step and a stretch
 * standing, a full dive once there is time to push off.
 */
export function keeperReach(t: number, react: number): number {
  const dive = clamp((t - react) / KEEPER.diveTime, 0, 1);
  return 0.55 + dive * 2.75;
}
