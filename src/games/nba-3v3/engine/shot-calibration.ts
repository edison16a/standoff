/**
 * How often the ball physics drops a shot for each spread of release
 * error, by family. Made by `physics/calibrate.test.ts` (1200 shots a
 * cell); run it again whenever the ball physics change, and paste its
 * output here.
 */

/** `reverse` is a layup flipped up from under the ring on the far side, the hardest angle there is. */
export type Family = "jumper" | "free" | "floater" | "layup" | "reverse" | "bank" | "bankJumper" | "dunk";

/** The spreads the table is measured at, in metres of error in the rim plane (or on the glass for a bank). */
export const SPREADS = [0.02, 0.04, 0.06, 0.08, 0.1, 0.13, 0.16, 0.2, 0.25, 0.3, 0.4, 0.55] as const;

export const CALIBRATION = {
  /** Jumpers, by distance from the rim in metres. */
  jumperAt: [2.4, 4.6, 6.7, 8.5],
  jumperRows: [
    [1, 0.998, 0.935, 0.776, 0.633, 0.494, 0.38, 0.298, 0.213, 0.179, 0.117, 0.082],
    [1, 0.998, 0.894, 0.703, 0.547, 0.428, 0.311, 0.235, 0.16, 0.132, 0.091, 0.066],
    [1, 0.99, 0.857, 0.646, 0.482, 0.349, 0.252, 0.187, 0.127, 0.098, 0.068, 0.053],
    [1, 0.973, 0.823, 0.61, 0.46, 0.323, 0.233, 0.177, 0.114, 0.092, 0.064, 0.051],
  ],
  free: [1, 0.998, 0.918, 0.755, 0.623, 0.493, 0.385, 0.273, 0.214, 0.164, 0.118, 0.058],
  floater: [1, 0.995, 0.919, 0.763, 0.629, 0.494, 0.387, 0.278, 0.205, 0.172, 0.119, 0.063],
  layup: [1, 0.999, 0.998, 0.957, 0.888, 0.744, 0.603, 0.472, 0.371, 0.309, 0.194, 0.132],
  reverse: [1, 0.999, 0.998, 0.964, 0.895, 0.748, 0.605, 0.471, 0.368, 0.324, 0.216, 0.136],
  bank: [1, 0.999, 0.964, 0.869, 0.759, 0.626, 0.543, 0.429, 0.329, 0.288, 0.22, 0.167],
  bankJumper: [1, 0.994, 0.93, 0.796, 0.692, 0.528, 0.417, 0.304, 0.21, 0.173, 0.103, 0.073],
  dunk: [1, 0.999, 0.988, 0.887, 0.768, 0.59, 0.453, 0.317, 0.22, 0.185, 0.096, 0.054],
} as const satisfies Record<Exclude<Family, "jumper">, readonly number[]> & { jumperAt: readonly number[]; jumperRows: readonly (readonly number[])[] };
