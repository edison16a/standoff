import * as THREE from "three";
import { TEAMS } from "../../teams";
import { deckTop, LOWER, ROOF, SUITES, UPPER } from "./bowl";
import { deckProfile, ringStrip, type Profile } from "./ring-strip";
import { ribbonTexture, suitesTexture } from "./stand-textures";

/** The two glowing rings, their textures, and the concrete, as three meshes. */
export interface Stands {
  meshes: THREE.Mesh[];
  dispose(): void;
}

const navy = new THREE.Color("#1a2134");
const seatTint = (team: 0 | 1) => new THREE.Color(TEAMS[team].dark).lerp(navy, 0.45);
const HOME = seatTint(0);
const AWAY = seatTint(1);
const scratch = new THREE.Color();

/**
 * Seat colour by place: each team's side in its own dark shade, the ends
 * blending between, every other row a touch darker so the decks read as
 * rows of seats and not a ramp.
 */
function seatColour(t: number, k: number): THREE.Color {
  const side = Math.sin(t);
  scratch.copy(AWAY).lerp(HOME, THREE.MathUtils.smoothstep(side, -0.4, 0.4));
  const row = Math.floor(k / 4);
  if (row % 2 === 1) scratch.multiplyScalar(0.82);
  return scratch;
}

/** Plain concrete, a little darker the higher it is so the roofline sinks into the night. */
function concrete(_t: number, k: number, profile: Profile): THREE.Color {
  const y = profile[k]![1];
  return scratch.set("#4a4e57").multiplyScalar(1 - Math.min(0.55, y / 90));
}

/**
 * The building round the field, swept as rings (ring-strip.ts): a padded
 * front wall, the lower deck, a concourse floor up to the suites, the
 * upper deck over them, its back wall and the roof canopy. Two lit rings
 * go round it: an LED ribbon on the lower deck's rail and the warm glass
 * of the suites. All of it in three draw calls.
 */
export function stands(low: boolean): Stands {
  const segments = low ? 72 : 180;
  const lowTop = deckTop(LOWER);
  const upTop = deckTop(UPPER);
  const parts: THREE.BufferGeometry[] = [];
  const shell = (profile: Profile) => parts.push(ringStrip(profile, { segments, colour: (t, k) => concrete(t, k, profile) }));
  // The front wall, its padded cap, and the gap down to the first row.
  shell([[0, 0], [0, LOWER.base - 0.2], [-0.25, LOWER.base - 0.2], [-0.25, LOWER.base], [0, LOWER.base]]);
  parts.push(ringStrip(deckProfile(LOWER), { segments, colour: seatColour }));
  // The concourse behind the lower deck, the suites' base, and the soffit under the upper deck.
  shell([[lowTop.out, lowTop.y + 0.5], [lowTop.out, lowTop.y], [SUITES.out, lowTop.y], [SUITES.out, SUITES.bottom]]);
  shell([[SUITES.out, SUITES.top], [UPPER.out, UPPER.base - 1.4], [UPPER.out, UPPER.base]]);
  parts.push(ringStrip(deckProfile(UPPER), { segments, colour: seatColour }));
  // The back wall up to the roof, the roof's top, its thick inner lip and the dark underside.
  shell([[upTop.out, upTop.y], [upTop.out + 0.6, ROOF.y]]);
  shell([[ROOF.back, ROOF.y], [ROOF.inner, ROOF.y], [ROOF.inner, ROOF.y - ROOF.thickness], [ROOF.back, ROOF.y - ROOF.thickness]]);
  const shellGeo = mergeAll(parts);
  const shellMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const shellMesh = new THREE.Mesh(shellGeo, shellMat);
  shellMesh.receiveShadow = !low;

  // The LED rail along the top of the lower deck, the team names running round in their colours.
  const ribbon = ribbonTexture();
  const ribbonGeo = ringStrip([[lowTop.out, lowTop.y + 0.5], [lowTop.out, lowTop.y + 1.8]], { segments, uMetres: 26 });
  const ribbonMat = new THREE.MeshBasicMaterial({ map: ribbon, color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.DoubleSide });
  const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);

  // The suites: warm glass with dark mullions, some boxes brighter than others.
  const glass = suitesTexture();
  const glassGeo = ringStrip([[SUITES.out, SUITES.bottom], [SUITES.out, SUITES.top]], { segments, uMetres: 48 });
  const glassMat = new THREE.MeshBasicMaterial({ map: glass, color: new THREE.Color(1.3, 1.2, 1.1), side: THREE.DoubleSide });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);

  return {
    meshes: [shellMesh, ribbonMesh, glassMesh],
    dispose() {
      for (const g of [shellGeo, ribbonGeo, glassGeo]) g.dispose();
      for (const m of [shellMat, ribbonMat, glassMat]) m.dispose();
      ribbon.dispose();
      glass.dispose();
    },
  };
}

/** Joins indexed ring strips into one geometry, keeping their colours. */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let count = 0;
  for (const p of parts) count += p.getAttribute("position").count;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const index: number[] = [];
  let at = 0;
  for (const p of parts) {
    position.set(p.getAttribute("position").array as Float32Array, at * 3);
    normal.set(p.getAttribute("normal").array as Float32Array, at * 3);
    color.set(p.getAttribute("color").array as Float32Array, at * 3);
    for (const i of p.getIndex()!.array) index.push(i + at);
    at += p.getAttribute("position").count;
    p.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geo.setIndex(index);
  return geo;
}
