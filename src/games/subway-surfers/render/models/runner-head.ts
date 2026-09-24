import * as THREE from "three";
import type { Look } from "./runner-model";
import type { Dresser } from "./rig";

const matte = (color: number) => ({ color, finish: "matte" as const });
const satin = (color: number) => ({ color, finish: "satin" as const });
const gloss = (color: number) => ({ color, finish: "gloss" as const });

/** The head's radius. Big, as cartoon runners have. */
const R = 0.17;
const CY = 0.16;

/**
 * A runner's head: a big cartoon head with ears, glossy eyes, brows, a
 * grin and the hair. The face looks down -z, the way the runner runs,
 * though players mostly see the back of it.
 */
export function dressHead(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const skin = matte(look.skin);
  head.sphere(R, skin, [0, CY, 0], [1, 1.06, 1], 24);
  // A fuller jaw and cheeks give the face its chunky cartoon shape.
  head.sphere(0.13, skin, [0, CY - 0.075, -0.035], [1.08, 0.78, 1], 18);
  for (const x of [-1, 1]) {
    head.sphere(0.045, skin, [x * R, CY - 0.01, 0.01], [0.55, 1, 0.9], 12);
    head.sphere(0.022, matte(shade(look.skin, 0.8)), [x * (R + 0.012), CY - 0.01, 0.01], [0.4, 0.7, 0.6], 8);
    // Eyes: glossy whites, big dark pupils and a glint, so they read from across a room.
    head.sphere(0.044, gloss(0xffffff), [x * 0.062, CY + 0.025, -0.145], [1, 1.28, 0.55], 14);
    head.sphere(0.026, gloss(0x24160f), [x * 0.058, CY + 0.02, -0.163], [1, 1.2, 0.45], 12);
    head.sphere(0.009, { color: 0xffffff, finish: "glow" }, [x * 0.052 + 0.008, CY + 0.034, -0.176], [1, 1, 0.6], 6);
    // Thick brows, tilted up at the middle for a cheeky look.
    head.box(0.07, 0.02, 0.03, satin(look.hair), [x * 0.064, CY + 0.092, -0.15], [0.25, 0, x * 0.2], 0.009);
    head.sphere(0.026, matte(shade(look.skin, 1.12, 0xff6f7d)), [x * 0.098, CY - 0.045, -0.135], [1, 0.62, 0.35], 8);
  }
  head.sphere(0.026, skin, [0, CY - 0.018, -0.172], [0.95, 0.82, 1], 10);
  // A wide open grin.
  const smile = new THREE.TorusGeometry(0.045, 0.012, 6, 16, Math.PI);
  smile.rotateZ(Math.PI);
  head.add(smile, matte(0x5a1f1f), [0, CY - 0.058, -0.162], [-0.25, 0, 0]);
  head.sphere(0.03, matte(0x7a2a2a), [0, CY - 0.083, -0.155], [1.2, 0.5, 0.4], 10);
  head.box(0.05, 0.012, 0.012, matte(0xffffff), [0, CY - 0.07, -0.168], [-0.25, 0, 0], 0.004);

  if (look.style === "cap") cap(dress, look);
  else bun(dress, look);
}

function cap(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const hair = satin(look.hair);
  // Hair shows at the sides and back under a backwards cap.
  head.sphere(R + 0.004, hair, [0, CY + 0.02, 0.014], [1.02, 1, 1.02], 18);
  for (const x of [-1, 1]) head.box(0.03, 0.09, 0.07, hair, [x * (R - 0.01), CY - 0.02, -0.03], undefined, 0.012);
  head.sphere(R + 0.012, satin(look.top), [0, CY + 0.06, 0.005], [1, 0.74, 1.02], 22);
  head.box(0.26, 0.035, 0.18, satin(look.pack), [0, CY + 0.035, R + 0.07], [-0.22, 0, 0], 0.016);
  head.sphere(0.024, satin(look.pack), [0, CY + R * 0.74 + 0.07, 0.005]);
  // The strap and its snaps show at the front, since the cap is on backwards.
  head.box(0.1, 0.028, 0.02, matte(0x2a2d35), [0, CY + 0.045, -R + 0.005], [0.35, 0, 0], 0.008);
  // Headphones round the neck, a splash of colour from behind.
  head.add(ringGeometry(), gloss(look.pack), [0, -0.03, 0.02]);
}

function bun(dress: Dresser, look: Look): void {
  const head = dress.on("head");
  const hair = satin(look.hair);
  head.sphere(R + 0.007, hair, [0, CY + 0.035, 0.02], [1.03, 1, 1.03], 22);
  // A fringe swept to one side over the forehead.
  head.sphere(0.1, hair, [-0.055, CY + 0.105, -0.1], [1.4, 0.55, 0.8], 14);
  head.sphere(0.075, hair, [0.075, CY + 0.12, -0.09], [1.2, 0.5, 0.8], 12);
  // The bun on top, and headbands in her pack's colour.
  head.sphere(0.09, hair, [0, CY + 0.22, 0.07], [1, 0.95, 1], 16);
  head.add(bandGeometry(0.092), satin(look.pack), [0, CY + 0.22, 0.07], [0.2, 0, 0]);
  head.add(bandGeometry(R + 0.008), satin(look.pack), [0, CY + 0.075, 0.01], [-0.35, 0, 0]);
  for (const x of [-1, 1]) head.sphere(0.02, gloss(0xffd21f), [x * (R + 0.01), CY - 0.045, -0.005]);
}

function bandGeometry(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(radius, 0.02, 8, 28);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function ringGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.TorusGeometry(0.11, 0.024, 8, 24, Math.PI * 1.3);
  geometry.rotateX(Math.PI / 2);
  geometry.rotateY(Math.PI * 0.35);
  return geometry;
}

/** The skin a little lighter or darker, or tinted toward another colour, for ears and cheeks. */
function shade(skin: number, light: number, tint?: number): number {
  const c = new THREE.Color(skin).multiplyScalar(light);
  if (tint !== undefined) c.lerp(new THREE.Color(tint), 0.4);
  return c.getHex();
}
