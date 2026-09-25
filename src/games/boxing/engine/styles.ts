/**
 * How a boxer moves their feet: where they like to fight from and how
 * they get there. The engine only knows these by name, so the pure fight
 * logic never reaches into how a boxer looks.
 */
export interface RingStyle {
  /** The gap they like between their middle and the other boxer's, in metres. */
  range: number;
  /** How fast they walk forward to close a gap, in metres a second. A stalker keeps coming, slowly. */
  stalk: number;
  /** How fast they circle round the other boxer, in metres a second. */
  circle: number;
  /** How often they switch the way they circle, in milliseconds between changes. */
  switchMs: readonly [number, number];
  /** 0 to 1: how hard they step across to cut off the ring when the other boxer is near the ropes. */
  cut: number;
  /** How far they step back after throwing a combination, in metres. */
  retreat: number;
  /** How far they rock in and out of range on the balls of their feet, in metres. */
  rhythm: number;
}

/** A pressure fighter: walks you down, cuts the ring off, rarely takes a step back. */
const PRESSURE: RingStyle = { range: 1.02, stalk: 0.5, circle: 0.28, switchMs: [2200, 4200], cut: 0.9, retreat: 0.12, rhythm: 0.05 };
/** A boxer puncher: a bit of everything. */
const BOXER_PUNCHER: RingStyle = { range: 1.12, stalk: 0.32, circle: 0.45, switchMs: [1600, 3400], cut: 0.55, retreat: 0.25, rhythm: 0.08 };
/** An out boxer: long range, always on the move, pops out after every flurry. */
const OUT_BOXER: RingStyle = { range: 1.3, stalk: 0.14, circle: 0.8, switchMs: [1100, 2400], cut: 0.15, retreat: 0.4, rhythm: 0.12 };
/** A swarmer: right in your chest, bobbing, never still. */
const SWARMER: RingStyle = { range: 0.98, stalk: 0.62, circle: 0.36, switchMs: [900, 2000], cut: 0.7, retreat: 0.1, rhythm: 0.07 };

const BY_NAME: Record<string, RingStyle> = {
  rocco: PRESSURE,
  marcus: BOXER_PUNCHER,
  kenji: OUT_BOXER,
  diego: SWARMER,
};

/** The footwork for a boxer, by the id of the boxer chosen. Anyone unknown boxes in the middle of the road. */
export function ringStyleFor(name: string | undefined): RingStyle {
  return (name && BY_NAME[name]) || BOXER_PUNCHER;
}
