import * as THREE from "three";
import type { Look } from "./runner-model";
import type { Dresser } from "./rig";

const matte = (color: number) => ({ color, finish: "matte" as const });
const satin = (color: number) => ({ color, finish: "satin" as const });
const gloss = (color: number) => ({ color, finish: "gloss" as const });

/**
 * A runner's head: a big cartoon head, as the style asks, with ears,
 * eyes that catch the light, brows, a grin and the hair. The face looks
 * down -z, the way the runner runs, though players mostly see the back.
 */
export function dressHead(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const skin = matte(look.skin);
  const cy = 0.15;
  head.sphere(0.155, skin, [0, cy, 0], [1, 1.08, 1.02], 22);
  // A rounder jaw and cheeks give the face its chunky cartoon shape.
  head.sphere(0.12, skin, [0, cy - 0.07, -0.03], [1.05, 0.8, 1], 18);
  for (const x of [-1, 1]) {
    head.sphere(0.04, skin, [x * 0.155, cy - 0.005, 0.01], [0.6, 1, 0.9], 10);
    // Eyes: white, a dark pupil and a tiny highlight.
    head.sphere(0.036, gloss(0xffffff), [x * 0.055, cy + 0.02, -0.132], [1, 1.25, 0.6], 12);
    head.sphere(0.02, gloss(0x1b1320), [x * 0.055, cy + 0.015, -0.152], [1, 1.2, 0.6], 10);
    head.sphere(0.006, { color: 0xffffff, finish: "glow" }, [x * 0.052 + 0.006, cy + 0.028, -0.163], [1, 1, 1], 6);
    head.box(0.065, 0.016, 0.02, satin(look.hair), [x * 0.058, cy + 0.075, -0.135], [0, 0, x * -0.18], 0.006);
    head.sphere(0.022, matte(blush(look.skin)), [x * 0.085, cy - 0.045, -0.12], [1, 0.6, 0.3], 8);
  }
  head.sphere(0.024, skin, [0, cy - 0.02, -0.155], [0.9, 0.8, 1], 10);
  // A wide grin.
  head.box(0.07, 0.018, 0.02, matte(0x5a1f1f), [0, cy - 0.08, -0.14], [0.2, 0, 0], 0.008);
  head.box(0.05, 0.008, 0.012, matte(0xffffff), [0, cy - 0.074, -0.148], [0.2, 0, 0], 0.003);

  if (look.style === "cap") cap(dress, look, cy);
  else bun(dress, look, cy);
}

function cap(dress: Dresser, look: Look, cy: number): void {
  const head = dress.on("head");
  const hair = satin(look.hair);
  // Hair shows at the sides and back under a backwards cap.
  head.sphere(0.158, hair, [0, cy + 0.02, 0.012], [1.02, 1, 1.02], 18);
  for (const x of [-1, 1]) head.box(0.03, 0.08, 0.06, hair, [x * 0.148, cy - 0.02, -0.02], undefined, 0.012);
  const capColor = satin(look.top);
  head.sphere(0.165, capColor, [0, cy + 0.06, 0.005], [1, 0.72, 1.02], 20);
  head.box(0.24, 0.035, 0.16, satin(look.pack), [0, cy + 0.03, 0.2], [-0.25, 0, 0], 0.016);
  head.box(0.34, 0.03, 0.03, satin(look.topTrim), [0, cy + 0.025, -0.12], undefined, 0.012);
  head.sphere(0.022, satin(look.topTrim), [0, cy + 0.175, 0.005]);
  // The snap strap at the front, since the cap is on backwards.
  head.box(0.1, 0.03, 0.02, matte(0x2a2d35), [0, cy + 0.03, -0.155]);
  // Headphones round the neck, a splash of colour from behind.
  head.add(ringGeometry(), gloss(look.pack), [0, -0.02, 0.02]);
}

function bun(dress: Dresser, look: Look, cy: number): void {
  const head = dress.on("head");
  const hair = satin(look.hair);
  head.sphere(0.162, hair, [0, cy + 0.035, 0.018], [1.03, 1, 1.03], 20);
  // A fringe swept to one side over the forehead.
  head.sphere(0.09, hair, [-0.05, cy + 0.1, -0.09], [1.4, 0.55, 0.8], 14);
  head.sphere(0.07, hair, [0.07, cy + 0.11, -0.08], [1.2, 0.5, 0.8], 12);
  // The bun on top, and a headband in the team colour.
  head.sphere(0.085, hair, [0, cy + 0.2, 0.06], [1, 0.95, 1], 16);
  head.add(bandGeometry(0.087), satin(look.pack), [0, cy + 0.2, 0.06], [0.2, 0, 0]);
  head.add(bandGeometry(0.163), satin(look.pack), [0, cy + 0.07, 0.01], [-0.35, 0, 0]);
  for (const x of [-1, 1]) head.sphere(0.018, gloss(0xffd21f), [x * 0.16, cy - 0.04, -0.005]);
}


function bandGeometry(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, 0.018, 8, 28);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function ringGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(0.1, 0.022, 8, 24, Math.PI * 1.3);
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(Math.PI * 0.35);
  return geometry;
}

/** A rosy tint of the skin, for the cheeks. */
function blush(skin: number): number {
  const c = new THREE.Color(skin).lerp(new THREE.Color(0xff6f7d), 0.45);
  return c.getHex();
}
