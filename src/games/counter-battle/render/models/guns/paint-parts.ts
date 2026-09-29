import { ball, box, cyl, paint, roundBox, shade, torus } from "../../geo";
import { GunPiece, tubeZ } from "./gun-kit";

/**
 * Parts every paintball marker shares: the air tank that doubles as the
 * stock, a wide barrel with vent holes near the tip, a magazine with a
 * window full of paint, and a hopper. Guns are built along +z with y up.
 */

/** Paintballs are about 17 mm across. */
export const BALL = 0.0087;

/** A compressed air tank lying along z from `front` back to `back`, with its gauge and a padded end. */
export function airTank(p: GunPiece, front: number, back: number, y: number, r: number, colour: string): void {
  const len = front - back;
  const mid = (front + back) / 2;
  p.add("metal", paint(tubeZ(r, r, len, 20), colour, { at: [0, y, mid] }));
  // Rounded ends and a rubber cover over most of the bottle.
  p.add("metal", paint(ball(r, 20, 10), colour, { at: [0, y, back], scale: [1, 1, 0.55] }));
  p.add("poly", paint(tubeZ(r + 0.003, r + 0.003, len * 0.6, 20), "#1d2026", { at: [0, y, back + len * 0.38] }));
  for (const z of [back + len * 0.1, back + len * 0.66]) p.add("poly", paint(torus(r + 0.003, 0.003, 20, 6), shade(colour, -0.35), { at: [0, y, z] }));
  // The regulator where the tank screws in, and its gauge on the side.
  p.add("metal", paint(tubeZ(r * 0.7, r * 0.8, 0.03, 16), "#b9bec7", { at: [0, y, front + 0.012] }));
  p.add("metal", paint(cyl(0.011, 0.011, 0.012, 14), "#b9bec7", { at: [-r * 0.85, y, front + 0.01], rot: [0, 0, Math.PI / 2] }));
  p.add("glass", paint(cyl(0.009, 0.009, 0.002, 14), "#e9eef5", { at: [-r * 0.85 - 0.007, y, front + 0.01], rot: [0, 0, Math.PI / 2] }));
}

/** A wide paintball barrel from `from` to `to` along z, with rows of vent holes near its tip. */
export function portedBarrel(p: GunPiece, from: number, to: number, y: number, r: number, colour: string): void {
  const len = to - from;
  p.add("metal", paint(tubeZ(r, r * 0.92, len, 18), colour, { at: [0, y, from + len / 2] }));
  p.add("metal", paint(tubeZ(r * 1.25, r * 1.25, 0.025, 18), shade(colour, 0.2), { at: [0, y, from + 0.012] }));
  // Vent holes spiral round the last stretch, dark against the finish.
  for (let i = 0; i < 12; i++) {
    const a = i * 1.1;
    const z = to - 0.02 - (i % 4) * 0.022;
    p.add("metal", paint(box(0.005, 0.005, 0.01), "#050608", { at: [Math.sin(a) * r * 0.97, y + Math.cos(a) * r * 0.97, z] }));
  }
  // The bore: a dark disc at the tip, so the barrel reads as hollow.
  p.add("metal", paint(cyl(r * 0.62, r * 0.62, 0.002, 14), "#050608", { at: [0, y, to + 0.001], rot: [Math.PI / 2, 0, 0] }));
}

/**
 * A magazine of paint in the team colour: a dark shell with a long
 * window down the side, the balls stacked behind it, and a coloured base.
 * Built hanging down from its origin, which sits in the magazine well.
 */
export function paintMag(m: GunPiece, height: number, depth: number, accent: string, lean = 0): void {
  const w = 0.03;
  // A spine front and back, open between them so the stack of paint shows from the side.
  for (const side of [-1, 1]) m.add("poly", paint(roundBox(w, height, depth * 0.3, 0.006), "#22262d", { at: [0, -height / 2, side * depth * 0.35], rot: [lean, 0, 0] }));
  m.add("poly", paint(box(w * 0.4, height, depth * 0.5), "#16191e", { at: [0, -height / 2, 0], rot: [lean, 0, 0] }));
  // The shell leans about its middle, so every part down it slides forward to match.
  const along = (y: number) => (y + height / 2) * Math.sin(lean);
  const count = Math.floor((height * 0.72) / (BALL * 2));
  for (let i = 0; i < count; i++) {
    const y = -height * 0.16 - BALL - i * BALL * 2;
    m.add("poly", paint(ball(BALL, 10, 8), i % 2 ? accent : shade(accent, 0.18), { at: [0, y, along(y) + (i % 2 ? 0.003 : -0.003)] }));
  }
  const base = -height + 0.004;
  m.add("poly", paint(roundBox(w + 0.006, 0.014, depth + 0.006, 0.004), accent, { at: [0, base, along(base)], rot: [lean, 0, 0] }));
}

/** A gravity hopper on a feed neck: a smoke shell with paint showing through its lid. */
export function hopper(p: GunPiece, x: number, y: number, z: number, accent: string): void {
  p.add("metal", paint(cyl(0.012, 0.012, 0.05, 12), "#2a2e36", { at: [x, y + 0.025, z] }));
  p.add("glass", paint(ball(0.06, 20, 14), "#4a5666", { at: [x, y + 0.085, z - 0.02], scale: [0.8, 0.62, 1.2] }));
  p.add("poly", paint(ball(0.06, 20, 10), accent, { at: [x, y + 0.1, z - 0.02], scale: [0.66, 0.5, 1.04] }));
  p.add("poly", paint(roundBox(0.05, 0.012, 0.06, 0.005), "#1a1d22", { at: [x, y + 0.12, z + 0.02] }));
}
