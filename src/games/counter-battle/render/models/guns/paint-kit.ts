import { ball, box, cyl, paint, roundBox } from "../../geo";
import { tubeZ, type GunPiece } from "./gun-kit";

/**
 * The parts that make a gun a paint marker, shared by all four: the
 * hopper of paintballs on top, the air tank, and a thin ported barrel.
 * Each takes the piece it goes into and where it sits.
 */

const SMOKE = "#2a2f3a";
const CHROME = "#c9d1da";

/**
 * The loader: a rounded shell on a short neck, its lid in the team
 * colour, with paintballs showing through the window along its side.
 */
export function hopper(p: GunPiece, x: number, y: number, z: number, accent: string, scale = 1): void {
  const s = scale;
  p.add("poly", paint(cyl(0.014 * s, 0.018 * s, 0.05 * s, 12), SMOKE, { at: [x, y + 0.02 * s, z] }));
  p.add("poly", paint(roundBox(0.085 * s, 0.1 * s, 0.15 * s, 0.035 * s, 3), "#1d222b", { at: [x, y + 0.09 * s, z - 0.01 * s] }));
  p.add("poly", paint(roundBox(0.087 * s, 0.03 * s, 0.1 * s, 0.014 * s), accent, { at: [x, y + 0.14 * s, z - 0.015 * s] }));
  // Balls behind the window on each side, in the team colour so a glance tells whose marker it is.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        p.add("glass", paint(ball(0.0105 * s, 8, 6), accent, { at: [x + side * 0.037 * s, y + (0.07 + j * 0.024) * s, z + (-0.05 + i * 0.03) * s] }));
      }
    }
  }
}

/** The compressed air bottle with its regulator, lying along the gun. */
export function airTank(p: GunPiece, x: number, y: number, zFront: number, length: number, radius: number): void {
  p.add("metal", paint(tubeZ(radius, radius, length, 18), CHROME, { at: [x, y, zFront - length / 2] }));
  p.add("metal", paint(ball(radius, 16, 10), CHROME, { at: [x, y, zFront - length], scale: [1, 1, 0.6] }));
  // The regulator and its gauge at the neck.
  p.add("metal", paint(tubeZ(radius * 0.55, radius * 0.7, 0.03, 12), "#30343c", { at: [x, y, zFront + 0.012] }));
  p.add("glass", paint(cyl(0.009, 0.009, 0.004, 12), "#e8eef4", { at: [x + radius * 0.7, y, zFront + 0.01], rot: [0, 0, Math.PI / 2] }));
}

/** A thin barrel with rows of vent ports near its end, the way paint barrels are cut. */
export function portedBarrel(p: GunPiece, y: number, zFrom: number, zTo: number, radius: number, colour: string): void {
  const length = zTo - zFrom;
  p.add("metal", paint(tubeZ(radius, radius * 0.95, length, 14), colour, { at: [0, y, zFrom + length / 2] }));
  for (let z = zTo - 0.1; z < zTo - 0.012; z += 0.018) {
    for (const side of [-1, 1]) p.add("metal", paint(box(0.003, 0.005, 0.008), "#07080a", { at: [side * radius * 0.98, y, z] }));
  }
  p.add("metal", paint(tubeZ(radius * 1.15, radius * 1.15, 0.012, 14), "#07080a", { at: [0, y, zTo - 0.006] }));
}
