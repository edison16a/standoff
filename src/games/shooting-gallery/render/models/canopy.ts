import * as THREE from "three";
import { BOOTH } from "../../engine/layout";
import { spiralTexture } from "../textures";
import { Bulbs } from "./bulbs";

/**
 * The front of the booth: a scalloped valance under a marquee board, a
 * candy striped post at each side, and strings of bulbs along the top of
 * the wall, the board and the posts. None of it casts a shadow, so the
 * canopy never throws a dark band across the striped wall.
 */

const FRONT_Z = 0.35;
const POST_Z = 0.45;
const BOARD_BOTTOM = 3.98;
const BOARD_HEIGHT = 0.5;
const SCALLOP_R = 0.3;
const SPAN = BOOTH.halfWidth * 2 + 1.2;

function gold(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: "#e0b04a", metalness: 0.85, roughness: 0.3 });
}

/** The marquee board, gold piped top and bottom. */
function board(): THREE.Group {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: "#a50f24", roughness: 0.55 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(SPAN, BOARD_HEIGHT, 0.08), paint);
  slab.position.set(0, BOARD_BOTTOM + BOARD_HEIGHT / 2, FRONT_Z);
  group.add(slab);
  const trim = gold();
  for (const y of [BOARD_BOTTOM, BOARD_BOTTOM + BOARD_HEIGHT]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, SPAN, 12), trim);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, y, FRONT_Z + 0.045);
    group.add(pipe);
  }
  return group;
}

/** Half discs hanging under the board, red and cream in turn, each edged in gold. */
function scallops(): THREE.Group {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: "#c8142f", roughness: 0.8, side: THREE.DoubleSide });
  const cream = new THREE.MeshStandardMaterial({ color: "#f1e7d3", roughness: 0.8, side: THREE.DoubleSide });
  const trim = gold();
  const cloth = new THREE.CircleGeometry(SCALLOP_R, 32, Math.PI, Math.PI);
  // A slight belly, so the cloth catches the light rather than sitting flat.
  const p = cloth.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.05 * (1 - (p.getX(i) / SCALLOP_R) ** 2) * (-p.getY(i) / SCALLOP_R));
  cloth.computeVertexNormals();
  const edge = new THREE.TorusGeometry(SCALLOP_R, 0.012, 8, 32, Math.PI);
  edge.rotateZ(Math.PI);
  const count = Math.ceil(SPAN / (SCALLOP_R * 2));
  for (let i = 0; i < count; i++) {
    const x = -SPAN / 2 + SCALLOP_R + i * SCALLOP_R * 2;
    const piece = new THREE.Mesh(cloth, i % 2 === 0 ? red : cream);
    piece.position.set(x, BOARD_BOTTOM, FRONT_Z + 0.03);
    const rim = new THREE.Mesh(edge, trim);
    rim.position.copy(piece.position);
    group.add(piece, rim);
  }
  return group;
}

/** Candy striped posts with gold collars, hiding where targets come and go. */
function posts(): THREE.Group {
  const group = new THREE.Group();
  const map = spiralTexture();
  map.repeat.set(2, 9);
  const stripe = new THREE.MeshStandardMaterial({ map, roughness: 0.45 });
  const trim = gold();
  const height = BOARD_BOTTOM + BOARD_HEIGHT;
  for (const side of [-1, 1]) {
    const x = side * (BOOTH.halfWidth + 0.12);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, height, 32), stripe);
    post.position.set(x, height / 2, POST_Z);
    group.add(post);
    for (const y of [0.3, height - 0.1]) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 10, 32), trim);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(x, y, POST_Z);
      group.add(collar);
    }
  }
  return group;
}

/** Where every bulb goes, and which way each one faces. */
function bulbPlaces(): { at: THREE.Vector3[]; facing: THREE.Vector3[] } {
  const at: THREE.Vector3[] = [];
  const facing: THREE.Vector3[] = [];
  const down = new THREE.Vector3(0, -1, 0);
  const out = new THREE.Vector3(0, 0, 1);
  // A string along the top of the wall, hanging just under the ceiling.
  for (let x = -BOOTH.halfWidth + 0.35; x <= BOOTH.halfWidth - 0.3; x += 0.92) {
    at.push(new THREE.Vector3(x, BOOTH.topY - 0.3, BOOTH.wallZ + 0.22));
    facing.push(down);
  }
  // A marquee row across the board.
  for (let x = -SPAN / 2 + 0.3; x <= SPAN / 2 - 0.2; x += 0.5) {
    at.push(new THREE.Vector3(x, BOARD_BOTTOM + BOARD_HEIGHT / 2, FRONT_Z + 0.1));
    facing.push(out);
  }
  // Up the front of each post.
  for (const side of [-1, 1]) {
    for (let y = 0.8; y < BOARD_BOTTOM - 0.1; y += 0.42) {
      at.push(new THREE.Vector3(side * (BOOTH.halfWidth + 0.12), y, POST_Z + 0.2));
      facing.push(out);
    }
  }
  return { at, facing };
}

/** The wire the wall's bulbs hang from, sagging between each one. */
function wire(points: readonly THREE.Vector3[]): THREE.Mesh {
  const path: THREE.Vector3[] = [];
  points.forEach((p, i) => {
    path.push(p.clone().add(new THREE.Vector3(0, 0.07, 0)));
    const next = points[i + 1];
    if (next) path.push(p.clone().lerp(next, 0.5).add(new THREE.Vector3(0, 0.015, 0)));
  });
  const curve = new THREE.CatmullRomCurve3(path);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, path.length * 6, 0.006, 6), new THREE.MeshStandardMaterial({ color: "#2a2320", roughness: 0.8 }));
}

export function createCanopy(): { object: THREE.Group; bulbs: Bulbs } {
  const places = bulbPlaces();
  const bulbs = new Bulbs(places.at, places.facing);
  const wallRow = places.at.filter((p) => p.z < BOOTH.wallZ + 1);
  const object = new THREE.Group();
  object.add(board(), scallops(), posts(), wire(wallRow), bulbs.object);
  return { object, bulbs };
}
