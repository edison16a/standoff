import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import { glowTexture, signTexture } from "../../textures";
import { worldMaterials } from "../../world/materials";

const LENGTH = 84;
const BEAM = 16;
/** Deck height above the water. */
export const SHIP_DECK = 5;

/** The hull's outline seen from above: a long body with a pointed bow toward +x. */
function hullShape(): THREE.Shape {
  const s = new THREE.Shape();
  const h = LENGTH / 2;
  const w = BEAM / 2;
  s.moveTo(-h, -w * 0.9);
  s.lineTo(h - 16, -w);
  s.quadraticCurveTo(h - 2, -w * 0.8, h, 0);
  s.quadraticCurveTo(h - 2, w * 0.8, h - 16, w);
  s.lineTo(-h, w * 0.9);
  s.quadraticCurveTo(-h - 2, 0, -h, -w * 0.9);
  return s;
}

function hullBand(b: MeshBuilder, from: number, to: number, mat: THREE.Material, inset = 0): void {
  const geo = new THREE.ExtrudeGeometry(hullShape(), { depth: to - from, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2);
  b.add(geo, mat, [0, from, 0], [0, 0, 0], [1 - inset, 1, 1 - inset]);
}

/**
 * The Northern Star, the cargo ship at pier nine: a black and red hull
 * with its name on the side, containers stacked on deck, two cargo
 * cranes, and a white bridge tower at the stern with its windows lit.
 * It lies across the end of the pier, length along x, waterline at y 0.
 */
export function buildShip(): THREE.Group {
  const m = worldMaterials();
  const b = new MeshBuilder();
  const red = new THREE.MeshStandardMaterial({ color: 0x6a1a14, roughness: 0.7, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6, metalness: 0.4 });
  hullBand(b, -3, 0.6, red);
  hullBand(b, 0.6, SHIP_DECK, black);
  hullBand(b, SHIP_DECK - 0.1, SHIP_DECK, m.roof, 0.03);
  for (const z of [-BEAM / 2 + 0.3, BEAM / 2 - 0.3]) b.box(LENGTH - 20, 0.9, 0.12, m.chrome, [-2, SHIP_DECK + 0.45, z]);

  // Bridge tower at the stern, with the funnel behind it.
  b.box(12, 11, 14, m.hospital, [-LENGTH / 2 + 9, SHIP_DECK + 5.5, 0]);
  b.box(3, 0.4, 20, m.hospital, [-LENGTH / 2 + 13, SHIP_DECK + 10.6, 0]);
  b.box(12.4, 0.5, 14.4, m.roof, [-LENGTH / 2 + 9, SHIP_DECK + 11.2, 0]);
  b.post(2.2, 8, black, [-LENGTH / 2 + 4, SHIP_DECK + 15, 0], 16);
  b.post(2.25, 1.4, red, [-LENGTH / 2 + 4, SHIP_DECK + 17.5, 0], 16);
  b.post(0.15, 9, m.darkMetal, [-LENGTH / 2 + 10, SHIP_DECK + 16, 0], 8);

  // Containers on deck, and two cargo cranes.
  for (let row = 0; row < 5; row++) {
    for (let col = -2; col <= 2; col++) {
      const high = 1 + ((row * 3 + col + 7) % 3);
      for (let l = 0; l < high; l++) {
        b.box(12, 2.55, 2.4, m.containers[(row + col + l + 10) % m.containers.length]!, [-14 + row * 12.6, SHIP_DECK + 1.3 + l * 2.6, col * 2.5]);
      }
    }
  }
  for (const x of [-8, 18]) {
    b.post(0.6, 14, m.containers[3]!, [x, SHIP_DECK + 7, BEAM / 2 - 2], 10);
    b.box(0.5, 0.5, 18, m.containers[3]!, [x, SHIP_DECK + 12, -1], [0.5, 0, 0]);
  }
  const group = new THREE.Group();
  group.add(b.build("ship"));

  const name = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.4), new THREE.MeshStandardMaterial({ map: signTexture("ship-name", ["NORTHERN STAR"], "#15171a", "#e8e2d0", 1024, 154), roughness: 0.6 }));
  name.position.set(18, SHIP_DECK - 1.6, BEAM / 2 + 0.05);
  group.add(name);
  // Deck lights and the lit bridge windows, each with a halo in the fog.
  const glow = glowTexture();
  for (const [x, y, z, c] of [
    [-LENGTH / 2 + 15.2, SHIP_DECK + 8, 0, 0xfff0c0],
    [-10, SHIP_DECK + 8, BEAM / 2 - 2, 0xfff0c0],
    [16, SHIP_DECK + 8, BEAM / 2 - 2, 0xfff0c0],
    [LENGTH / 2 - 4, SHIP_DECK + 3, 0, 0x40ff60],
    [-LENGTH / 2 + 10, SHIP_DECK + 20.5, 0, 0xff3030],
  ] as const) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.position.set(x, y, z);
    halo.scale.setScalar(4);
    group.add(halo);
  }
  return group;
}
