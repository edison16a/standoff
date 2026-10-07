import type { Steps } from "./spec";

/**
 * The feet on the floor through a gather, as a path: how far along the
 * run in to the takeoff spot the body is, 0 to 1, and how far off the
 * straight line, in metres toward the finish's side. The run in carries
 * the speed of the drive; each preset bends it its own way.
 */

const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const smooth = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (u: number) => Math.min(1, Math.max(0, u));

/** How far a euro step's first step goes the other way, and how wide a spin swings round the man. */
const EURO_OUT = 0.42;
const SPIN_OUT = 0.22;

/** `u` is 0 to 1 through the gather. */
export function gatherPath(steps: Steps, u: number): { along: number; lat: number } {
  const k = clamp01(u);
  switch (steps) {
    case "euro":
      // The first step at the defender, the other way from the finish; the long second step across.
      return { along: glide(k), lat: -EURO_OUT * Math.sin(Math.PI * clamp01(k / 0.62)) };
    case "fake":
      // Into the stop, a beat still for the fake, then the step through.
      if (k < 0.42) return { along: 0.5 * easeOut(k / 0.42), lat: 0 };
      if (k < 0.6) return { along: 0.5, lat: 0 };
      return { along: 0.5 + 0.5 * smooth((k - 0.6) / 0.4), lat: 0 };
    case "spin":
      // Round the man in a small arc while turning.
      return { along: glide(k), lat: -SPIN_OUT * Math.sin(Math.PI * k) };
    case "stop":
      // Braking hard into a jump stop: the speed dies on the last step.
      return { along: easeOut(k), lat: 0 };
    default:
      return { along: glide(k), lat: 0 };
  }
}

/** The plain run in: entered at twice the flying speed and slowing to it at the takeoff. */
function glide(k: number): number {
  return (2 * k - (k * k) / 2) / 1.5;
}

/**
 * The share of the whole drive (run in plus flight) covered on the
 * floor, so the speed in the air follows on from the last step: a glide
 * keeps going, a jump stop goes up nearly straight.
 */
export function floorShare(steps: Steps, gather: number, air: number): number {
  if (steps === "stop") return gather / (gather + 0.25 * air);
  if (steps === "fake") return (gather * 0.7) / (gather * 0.7 + air * 0.8);
  return (1.5 * gather) / (1.5 * gather + air);
}
