import { neutral, over, type Pose } from "../pose";

/**
 * The bodies the throwing motions are built from. The engine has the QB
 * facing his target through the whole throw, so these are authored in
 * that frame: a negative body yaw stands him side on with the left
 * shoulder at the target and his eyes still on it (neckY back the other
 * way), and the release turns him square or past it. He throws right
 * handed. A positive spine twist turns the chest to his left.
 */
const base = neutral();

/** Two hands on the ball up at the chest, ready to throw, eyes downfield. */
export const SET = over(base, {
  spineY: -0.15, pitch: 0.05,
  hipLX: -0.25, hipRX: 0.1, kneeL: 0.35, kneeR: 0.4,
  shLX: -0.55, shRX: -0.55, elL: -1.55, elR: -1.45, shLY: 0.55, shRY: 0.5, shLZ: 0.28, shRZ: 0.3,
});

/** The ball up behind the right ear, the elbow at shoulder height; the left arm points at the target. */
const ARM_LOADED: Partial<Pose> = {
  shRX: -0.25, shRZ: 1.45, elR: -1.75, shRY: -0.6,
  shLX: -1.35, shLZ: 0.35, elL: -0.35, shLY: 0.2,
};

/** The arm whipped over the top, the ball just gone, the left elbow tucked to the side. */
const ARM_RELEASE: Partial<Pose> = {
  shRX: -1.9, shRZ: 0.55, elR: -0.35, shRY: 0.2,
  shLX: -0.4, shLZ: 0.25, elL: -1.4, shLY: 0.6,
};

/** The throwing hand finishes down across the body by the left hip, thumb pointing down. */
const ARM_FOLLOW: Partial<Pose> = {
  shRX: -1.0, shRZ: -0.35, elR: -0.3, shRY: 0.7,
  shLX: 0.35, shLZ: 0.35, elL: -1.1,
};

// The flick: a short step with the left foot and a quick three quarter arm off set feet.
export const FLICK_LOAD = over(base, {
  yaw: -0.45, spineY: -0.4, spineZ: -0.1, pitch: -0.02, neckY: 0.85,
  hipLX: -0.35, hipRX: 0.15, kneeL: 0.2, kneeR: 0.5, ...ARM_LOADED,
});
export const FLICK_RELEASE = over(base, {
  yaw: 0.05, spineY: 0.3, spineX: 0.22, pitch: 0.16, neckY: -0.25,
  hipLX: -0.55, hipRX: 0.4, kneeL: 0.35, kneeR: 0.35, ...ARM_RELEASE,
});
export const FLICK_FOLLOW = over(base, {
  yaw: 0.2, spineY: 0.6, spineX: 0.35, pitch: 0.22, neckY: -0.4,
  hipLX: -0.5, hipRX: 0.3, kneeL: 0.4, kneeR: 0.85, ...ARM_FOLLOW,
});

// The bomb: side on, leaning back on the right leg with a long stride, then everything through the ball.
export const BOMB_LOAD = over(base, {
  yaw: -0.8, spineY: -0.5, spineX: -0.12, pitch: -0.1, neckY: 1.05, neckX: -0.1,
  hipLX: -0.85, kneeL: 0.5, hipRX: 0.35, kneeR: 0.65, hipLZ: 0.1,
  ...ARM_LOADED, shRX: 0.05, shRZ: 1.5, elR: -1.9, shRY: -0.75, shLX: -1.7, elL: -0.2,
});
export const BOMB_RELEASE = over(base, {
  yaw: 0.15, spineY: 0.4, spineX: 0.3, pitch: 0.22, neckY: -0.3, neckX: -0.15,
  hipLX: -0.8, kneeL: 0.25, hipRX: 0.55, kneeR: 0.3, hipLZ: 0.1,
  ...ARM_RELEASE, shRX: -2.3, shRZ: 0.45, elR: -0.25,
});
export const BOMB_FOLLOW = over(base, {
  yaw: 0.35, spineY: 0.75, spineX: 0.5, pitch: 0.36, neckY: -0.45,
  hipLX: -0.6, kneeL: 0.45, hipRX: -0.35, kneeR: 1.1,
  ...ARM_FOLLOW, shRX: -0.9, shRZ: -0.4, shRY: 0.75,
});

// On the run the legs keep their stride (index.ts); the chest turns and the arm comes through on top.
export const RUN_LOAD = over(base, { spineY: -0.55, spineZ: -0.08, neckY: 0.6, pitch: 0.05, ...ARM_LOADED });
export const RUN_RELEASE = over(base, { spineY: 0.35, spineX: 0.2, pitch: 0.14, neckY: -0.2, ...ARM_RELEASE });
export const RUN_FOLLOW = over(base, { spineY: 0.6, spineX: 0.28, pitch: 0.16, neckY: -0.3, ...ARM_FOLLOW });

// Under pressure: off the back foot, leaning away from the rush, the arm coming round lower and early.
export const FADE_LOAD = over(base, {
  yaw: -0.4, spineY: -0.45, pitch: -0.16, neckY: 0.7,
  hipLX: -0.55, kneeL: 0.75, hipRX: 0.05, kneeR: 0.35,
  ...ARM_LOADED, shRX: -0.1, shRZ: 1.35,
});
export const FADE_RELEASE = over(base, {
  yaw: 0, spineY: 0.25, spineX: -0.02, spineZ: 0.18, pitch: -0.2, neckY: -0.1,
  hipLX: 0.2, kneeL: 0.9, hipRX: -0.2, kneeR: 0.4,
  ...ARM_RELEASE, shRX: -1.35, shRZ: 1.0, elR: -0.45, shRY: 0.1,
});
export const FADE_FOLLOW = over(base, {
  yaw: 0.15, spineY: 0.55, spineX: 0.05, spineZ: 0.1, pitch: -0.12, neckY: -0.25,
  hipLX: -0.1, kneeL: 0.45, hipRX: -0.1, kneeR: 0.5,
  ...ARM_FOLLOW, shRX: -0.9, shRZ: 0.15, elR: -0.4,
});
