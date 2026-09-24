import * as THREE from "three";
import { BOARDS, BOOTH, boardTop, type WaveBoard } from "../../engine/layout";

/**
 * The painted wooden waves the ducks ride behind. Each is cut to the same
 * top edge the engine hit tests against, painted from a pale crest down to
 * deep blue, with a bright lip along the crest and a second painted swell
 * below it, like the cover.
 */

const REACH = BOOTH.halfWidth + 1.2;
const BOTTOM = -0.6;
const THICK = 0.05;
const PAINT = [
  { crest: "#2f78e8", deep: "#0b3494", lip: "#9fd0ff" },
  { crest: "#2a6fe0", deep: "#0a2f88", lip: "#94c8ff" },
  { crest: "#2766d6", deep: "#08297a", lip: "#8cc2ff" },
];

function edge(board: WaveBoard, drop: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  for (let x = -REACH; x <= REACH + 1e-6; x += 0.05) points.push(new THREE.Vector2(x, boardTop(board, x) - drop));
  return points;
}

/** The board itself, with a vertical colour ramp baked into its vertices. */
function slab(board: WaveBoard, paint: (typeof PAINT)[number]): THREE.Mesh {
  const shape = new THREE.Shape([new THREE.Vector2(-REACH, BOTTOM), ...edge(board, 0), new THREE.Vector2(REACH, BOTTOM)]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  geometry.translate(0, 0, -THICK);
  const crest = new THREE.Color(paint.crest);
  const deep = new THREE.Color(paint.deep);
  const p = geometry.attributes.position as THREE.BufferAttribute;
  const colours = new Float32Array(p.count * 3);
  const colour = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const below = boardTop(board, p.getX(i)) - p.getY(i);
    colour.copy(crest).lerp(deep, Math.min(1, below / 0.4));
    colours.set([colour.r, colour.g, colour.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  // The bevelled front face lands exactly on the plane the engine tests.
  mesh.position.z = board.z - 0.012;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A painted line following the crest, `drop` metres below it. */
function line(board: WaveBoard, drop: number, radius: number, colour: string): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(edge(board, drop).filter((_, i) => i % 2 === 0).map((p) => new THREE.Vector3(p.x, p.y, board.z + 0.004)));
  const material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, emissive: colour, emissiveIntensity: 0.12 });
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 400, radius, 6), material);
}

export function createWaves(): THREE.Group {
  const group = new THREE.Group();
  BOARDS.forEach((board, i) => {
    const paint = PAINT[i]!;
    group.add(slab(board, paint), line(board, 0.012, 0.014, paint.lip), line(board, 0.2, 0.008, paint.crest));
  });
  return group;
}
