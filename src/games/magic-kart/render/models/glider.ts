import * as THREE from "three";
import type { CharacterId } from "../../characters";
import { ball, merge, paint, rod, type V3 } from "./geo";
import { battenPath, HALF_SPAN, leadingEdgePath, PANELS, sailGeometry, sailPoint } from "./glider-sail";

/** Each driver's glider, in the colours of their kart. */
interface GliderStyle {
  /** The two cloth colours the panels alternate between. */
  cloth: readonly [string, string];
  /** The band along the leading edge. */
  band: string;
  /** Battens, keel and struts. */
  frame: string;
  /** The lights on the wing tips and the nose. */
  light: string;
}

const STYLES: Record<CharacterId, GliderStyle> = {
  // A flame red and gold kite for the fox.
  blaze: { cloth: ["#ff5a2c", "#ffc93c"], band: "#b8261a", frame: "#2b2b33", light: "#ffb030" },
  // Lily pad greens with a cream stripe for the frog.
  pip: { cloth: ["#43c95a", "#eaf8c8"], band: "#1f7a36", frame: "#5a4632", light: "#d8ff5a" },
  // White and electric blue with neon tips for the robot.
  nova: { cloth: ["#f2f6fc", "#2f8cff"], band: "#1b2a52", frame: "#9aa7bd", light: "#5ff2ff" },
  // Candy pink and cream for Mochi.
  mochi: { cloth: ["#ff7eb6", "#fff1e0"], band: "#c2417e", frame: "#f4d7e6", light: "#ffe1f0" },
};

/** Height of the wing's keel above the kart's wheels when fully open. */
export const GLIDER_TOP = 2.95;
/** Where the mast stands on the kart, behind the driver. */
export const MAST_BASE: V3 = [0, 0.9, -0.55];

/** The parts of one driver's glider, built once and shared by every copy of it. */
export interface GliderDesign {
  /** One half of the cloth, spanning +x from the keel. The other half is its mirror. */
  sail: THREE.BufferGeometry;
  /** A half's battens, leading edge spar and wing tip fairing, lit. */
  spars: THREE.BufferGeometry;
  /** A half's wing tip light. */
  tip: THREE.BufferGeometry;
  /** The keel along the middle of the wing, and the nose cap. */
  keel: THREE.BufferGeometry;
  /** The mast and the two struts from the kart up to the keel, built from the mast base up. */
  mast: THREE.BufferGeometry;
}

const cache = new Map<CharacterId, GliderDesign>();

export function gliderDesign(character: CharacterId): GliderDesign {
  const built = cache.get(character);
  if (built) return built;
  const design = build(STYLES[character]);
  cache.set(character, design);
  return design;
}

function tube(points: THREE.Vector3[], radius: number, color: string): THREE.BufferGeometry {
  return paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, radius, 8, false), color);
}

function build(style: GliderStyle): GliderDesign {
  const battens = Array.from({ length: PANELS + 1 }, (_, i) => tube(battenPath(i / PANELS), i === 0 ? 0.035 : 0.022, style.frame));
  const tipAt = sailPoint(1, 0.35);
  const spars = merge([
    ...battens,
    tube(leadingEdgePath(), 0.06, style.band),
    // A rounded fairing caps the tip, where the leading edge meets the outer batten.
    paint(ball(0.09, 12, 8), style.band, { at: [HALF_SPAN, sailPoint(1, 0).y, sailPoint(1, 0).z] }),
  ]);
  const tip = merge([paint(ball(0.07, 10, 8), style.light, { at: [tipAt.x + 0.02, tipAt.y + 0.02, tipAt.z] })]);
  const nose = sailPoint(0, 0);
  const tail = sailPoint(0, 1);
  const keel = merge([
    rod([0, nose.y + 0.04, nose.z + 0.12], [0, tail.y + 0.04, tail.z - 0.1], 0.05, style.frame, 10),
    paint(ball(0.11, 14, 10), style.band, { at: [0, nose.y + 0.04, nose.z + 0.14], scale: [1, 0.8, 1.5] }),
    paint(ball(0.06, 10, 8), style.light, { at: [0, nose.y + 0.04, nose.z + 0.3] }),
  ]);
  // The mast meets the keel a little behind the leading edge, where the wing balances.
  const top: V3 = [0, GLIDER_TOP - MAST_BASE[1], 0.2 - MAST_BASE[2]];
  const mast = merge([
    rod([0, 0, 0], top, 0.05, style.frame, 10),
    rod([0.55, -0.1, -0.2], top, 0.03, style.frame, 8),
    rod([-0.55, -0.1, -0.2], top, 0.03, style.frame, 8),
    // A cross brace and a hub where the struts meet, so it reads as a built frame, not three sticks.
    rod([0.3, 0.9, -0.03], [-0.3, 0.9, -0.03], 0.025, style.frame, 8),
    paint(ball(0.1, 12, 8), style.band, { at: [top[0], top[1] - 0.05, top[2]] }),
    paint(ball(0.08, 12, 8), style.band, { at: [0, 0, 0] }),
  ]);
  return { sail: sailGeometry(style.cloth, style.band), spars, tip, keel, mast };
}
