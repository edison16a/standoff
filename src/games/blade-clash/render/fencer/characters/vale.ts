import * as THREE from "three";
import { cloth, leather, metal, plastic, satin, skin } from "../../kit/materials";
import type { MeshBuilder } from "../../kit/mesh-builder";
import { maskMesh, namePrint } from "../../kit/textures";
import { dressBody, onTorso, TORSO_SCALE, torsoRadius } from "../anatomy";
import type { Dresser } from "../dresser";
import type { Look } from "./look";

const WHITE = 0xf7f6f1;
const NAVY = 0x14213d;

/**
 * Vale: a modern épée fencer. Bright whites, a navy mesh mask with its
 * white bib, a yellow glove with a long cuff, blue socks and pink shoes.
 * The player's colour runs down the sleeve and the side of the jacket, and
 * pipes the collar and the bib.
 */
export function dressVale(d: Dresser, look: Look): void {
  const whites = cloth(WHITE, 0.78);
  const trim = satin(look.trim);
  const glove = leather(0xffd23f, 0.55);
  dressBody(d, {
    top: whites,
    sleeve: whites,
    glove,
    freeHand: skin(0xe9b995),
    seat: whites,
    thigh: whites,
    shin: cloth(0x3a86ff, 0.7),
    shoe: plastic(0xff4d8d, 0.5),
    sole: plastic(0xf2f2f2, 0.6),
  });

  const chest = d.on("chest");
  // A short standing collar, piped in the player's colour.
  chest.cylinder(0.068, 0.078, 0.05, whites, [0, 0.515, 0], [0, 0, 0], 20, [0.9, 1, 1.05]);
  chest.add(new THREE.TorusGeometry(0.068, 0.006, 6, 24), trim, [0, 0.54, 0], [Math.PI / 2, 0, 0], [0.9, 1.05, 1]);
  // The side stripe, and the back zip.
  chest.tube([0.02, 0.1, 0.18, 0.26, 0.34, 0.42].map((y) => onTorso(y, 1.3, 1, 0.003)), 0.009, trim, 20, 6);
  chest.tube([0.0, 0.12, 0.24, 0.36, 0.46].map((y) => onTorso(y, Math.PI + 0.35, 1, 0.002)), 0.004, plastic(0x9aa3ad), 16, 4);
  // The jacket's hem flares a little over the breeches.
  chest.cylinder(0.13, 0.142, 0.05, whites, [0, -0.035, 0], [0, 0, 0], 24, [0.74, 1, 1.12]);

  for (const side of ["F", "B"] as const) {
    // A stripe down the outside of each sleeve.
    d.on(`upperArm${side}`).tube([[-0.05, -0.02, 0], [-0.054, -0.14, 0], [-0.044, -0.28, 0]], 0.007, trim, 10, 5);
    d.on(`forearm${side}`).tube([[-0.044, -0.01, 0], [-0.046, -0.1, 0], [-0.034, -0.2, 0]], 0.006, trim, 10, 5);
    // Breeches end below the knee, strapped, over the socks.
    const shin = d.on(`shin${side}`);
    shin.cylinder(0.066, 0.061, 0.08, whites, [0.004, -0.025, 0], [0, 0, 0], 18);
    shin.cylinder(0.063, 0.063, 0.014, trim, [0.004, -0.066, 0], [0, 0, 0], 18);
  }
  // The glove's long cuff over the sword sleeve.
  d.on("forearmF").cylinder(0.052, 0.04, 0.1, glove, [0, -0.22, 0], [0, 0, 0], 18);

  dressMask(d.on("head"), trim);
  d.attach("chest", backPrint(look));
}

/** VALE across the shoulders of the jacket, in the player's colour. */
function backPrint(look: Look): THREE.Mesh {
  const ink = `#${new THREE.Color(look.trim).getHexString()}`;
  const material = new THREE.MeshStandardMaterial({ map: namePrint("VALE", ink, look.mirrored), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  const r = torsoRadius(0.37) * 1.02;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 20, 1, true, Math.PI * 1.5 - 0.62, 1.24), material);
  mesh.scale.set(TORSO_SCALE.depth, 1, TORSO_SCALE.width);
  mesh.position.y = 0.37;
  return mesh;
}

/** The mask's wire front. */
function wire(): THREE.MeshStandardMaterial {
  const map = maskMesh();
  map.repeat.set(3, 2);
  return new THREE.MeshStandardMaterial({ map, metalness: 0.55, roughness: 0.4 });
}

/** The bowl's edge on one side, from the chin up to the crown, where the navy frame runs. */
function bowlEdge(side: 1 | -1): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const theta = 2.23 - (2.05 * i) / 12;
    points.push([0.036, 0.2 + 0.1536 * Math.cos(theta), side * 0.121 * Math.sin(theta)]);
  }
  return points;
}

function dressMask(b: MeshBuilder, trim: THREE.Material): void {
  const navy = cloth(NAVY, 0.6);
  const bibCloth = cloth(0xfafafa, 0.75);
  // The head behind the mask, and the neck under the bib.
  b.cylinder(0.05, 0.056, 0.12, bibCloth, [0, 0.03, 0], [0, 0, 0], 14);
  b.sphere(0.098, cloth(0x2a1d15, 0.9), [-0.015, 0.19, 0], [1, 1.08, 0.92], 18);
  // The mesh bowl over the face, framed in navy, with the tongue over the top of the head.
  const bowl = new THREE.SphereGeometry(0.128, 32, 20, Math.PI - 1.45, 2.9, 0.18, 2.05);
  b.add(bowl, wire(), [0.02, 0.2, 0], [0, 0, 0], [1.02, 1.2, 0.95]);
  b.tube([...bowlEdge(1), ...bowlEdge(-1).reverse()], 0.011, navy, 48, 8);
  b.tube([[0.03, 0.345, 0], [-0.05, 0.335, 0], [-0.1, 0.275, 0], [-0.115, 0.18, 0]], 0.02, navy, 16, 8);
  // The bib hangs from the bottom of the mask over the throat, piped in the player's colour.
  const bib = new THREE.SphereGeometry(0.128, 28, 8, Math.PI - 1.35, 2.7, 1.95, 0.55);
  b.add(bib, bibCloth, [0.03, 0.17, 0], [0, 0, 0], [1.05, 1.35, 1.02]);
  const edge: [number, number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const phi = Math.PI - 1.35 + (2.7 * i) / 16;
    const theta = 2.5;
    edge.push([0.03 - 0.128 * 1.05 * Math.cos(phi) * Math.sin(theta), 0.17 + 0.128 * 1.35 * Math.cos(theta), 0.128 * 1.02 * Math.sin(phi) * Math.sin(theta)]);
  }
  b.tube(edge, 0.005, trim, 32, 5);
  // Rivets where the bowl meets the frame.
  for (const z of [-1, 1]) b.sphere(0.009, metal(0xc9ced6, 0.3), [0.036, 0.2, z * 0.121], [1, 1, 1], 8);
}
