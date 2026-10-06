import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOARD, RIM } from "../../engine/tuning";
import { Bake } from "./bake";

const W = BOARD.halfWidth * 2;
const H = BOARD.top - BOARD.bottom;
const CY = (BOARD.top + BOARD.bottom) / 2;
/** The middle of the glass's thickness. */
export const GLASS_Z = BOARD.face - BOARD.thickness / 2;

/**
 * Tempered glass. Seen straight on it is nearly clear with a faint
 * green tint; what makes it read as glass is its reflection, which
 * grows toward grazing angles as the fresnel term says. A plain
 * transparent material fades its reflection with its opacity, so here
 * the reflected light itself raises the alpha: the lamps and the LED
 * boards show bright on the pane while the stands stay visible through it.
 */
function glassMaterial(): THREE.MeshPhysicalMaterial {
  const glass = new THREE.MeshPhysicalMaterial({ color: "#cfe9e4", transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  glass.customProgramCacheKey = () => "nba-glass";
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `vec3 glint = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
      float shine = clamp(max(glint.r, max(glint.g, glint.b)) * 1.4, 0.0, 1.0);
      gl_FragColor = vec4(outgoingLight, clamp(diffuseColor.a + shine, 0.0, 1.0));`,
    );
  };
  return glass;
}

/**
 * The backboard: the glass, its thin aluminium frame with a light strip
 * that flashes for the buzzer, the painted border and shooter's square,
 * and the padding along the bottom and up the lower sides. The frame is
 * returned apart so the hoop can light it.
 */
export function buildBackboard(): { group: THREE.Group; edge: THREE.MeshStandardMaterial; dispose: () => void } {
  const glass = glassMaterial();
  const edge = new THREE.MeshStandardMaterial({ color: "#16181d", emissive: "#000000", roughness: 0.25, metalness: 0.8 });
  const paint = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -1 });
  const pad = new THREE.MeshPhysicalMaterial({ color: "#1d3fbf", roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });

  const group = new THREE.Group();
  const pane = new THREE.Mesh(new RoundedBoxGeometry(W, H, BOARD.thickness * 0.5, 2, 0.008), glass);
  pane.position.set(0, CY, GLASS_Z);
  // Drawn after the players and the rim behind it, so they show through.
  pane.renderOrder = 2;
  group.add(pane);

  const frame = new Bake();
  const bar = (bw: number, bh: number, x: number, y: number) => frame.add(new RoundedBoxGeometry(bw, bh, BOARD.thickness + 0.01, 1, 0.008), edge, { x, y, z: GLASS_Z });
  bar(W + 0.04, 0.035, 0, BOARD.top);
  bar(W + 0.04, 0.035, 0, BOARD.bottom);
  bar(0.035, H, -BOARD.halfWidth, CY);
  bar(0.035, H, BOARD.halfWidth, CY);

  // The white border and the shooter's square are painted on both faces of the glass.
  const lines = new Bake();
  const line = (lw: number, lh: number, x: number, y: number) => {
    for (const face of [1, -1]) lines.add(new THREE.PlaneGeometry(lw, lh), paint, { x, y, z: GLASS_Z + face * (BOARD.thickness * 0.25 + 0.001), ry: face > 0 ? 0 : Math.PI });
  };
  const inset = 0.05;
  line(W - inset * 2, 0.05, 0, BOARD.top - inset);
  line(W - inset * 2, 0.05, 0, BOARD.bottom + inset);
  line(0.05, H - inset * 2, -BOARD.halfWidth + inset, CY);
  line(0.05, H - inset * 2, BOARD.halfWidth - inset, CY);
  const sq = { w: 0.59, h: 0.45, y: RIM.y + 0.15 };
  line(sq.w, 0.05, 0, sq.y + sq.h);
  line(sq.w, 0.05, 0, sq.y + 0.025);
  line(0.05, sq.h, -sq.w / 2 + 0.025, sq.y + sq.h / 2);
  line(0.05, sq.h, sq.w / 2 - 0.025, sq.y + sq.h / 2);

  // Padding along the bottom edge and a hand's length up each side, as the rules ask.
  const padding = new Bake();
  padding.add(new RoundedBoxGeometry(W + 0.12, 0.13, 0.14, 3, 0.045), pad, { y: BOARD.bottom - 0.05, z: GLASS_Z });
  for (const side of [-1, 1]) padding.add(new RoundedBoxGeometry(0.1, 0.42, 0.14, 3, 0.04), pad, { x: side * (BOARD.halfWidth + 0.03), y: BOARD.bottom + 0.19, z: GLASS_Z });

  for (const m of [...frame.build(false), ...lines.build(false), ...padding.build()]) group.add(m);
  const dispose = () => {
    for (const m of [glass, edge, paint, pad]) m.dispose();
  };
  return { group, edge, dispose };
}
