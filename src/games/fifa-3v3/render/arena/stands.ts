import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { PITCH } from "../../engine/tuning";
import type { Seat } from "./crowd";

const ROW_DEPTH = 0.85;
const ROW_RISE = 0.48;
const FIRST_ROW = 0.9;
const SPACING = 0.62;

interface StandSpec {
  /** Where the front row sits, and which way the rows climb. */
  front: number;
  /** "z" stands run along the sides, "x" stands behind the goals. */
  axis: "x" | "z";
  /** +1 climbs toward positive, -1 toward negative. */
  climb: 1 | -1;
  rows: number;
  /** Half the stand's length along its front. */
  half: number;
  roof: boolean;
}

const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;

// The side stands run past the ends of the pitch, the end stands just past its width.
const STANDS: StandSpec[] = [
  { front: -(HW + 3.2), axis: "z", climb: -1, rows: 13, half: HL + 7, roof: true },
  { front: HW + 3.2, axis: "z", climb: 1, rows: 9, half: HL + 7, roof: false },
  { front: -(HL + 6.5), axis: "x", climb: -1, rows: 9, half: HW + 2.5, roof: false },
  { front: HL + 6.5, axis: "x", climb: 1, rows: 9, half: HW + 2.5, roof: false },
];

/**
 * Four stands of stepped concrete with coloured seats, a roof over the
 * main stand with a strip of lights under it, and a seat for every fan.
 */
export function buildStands(): { group: THREE.Group; seats: Seat[]; dispose(): void } {
  const group = new THREE.Group();
  // Lambert keeps the stands cheap to draw; they sit in the dark beyond the floodlights anyway.
  const concrete = new THREE.MeshLambertMaterial({ color: "#1c1f27" });
  const seatMats = [new THREE.MeshLambertMaterial({ color: "#5c1420" }), new THREE.MeshLambertMaterial({ color: "#14295e" })];
  const roofMat = new THREE.MeshStandardMaterial({ color: "#1b1d24", roughness: 0.7, metalness: 0.3 });
  const glow = new THREE.MeshBasicMaterial({ color: "#fff4d6", toneMapped: false });
  const geometries: THREE.BufferGeometry[] = [];
  const seats: Seat[] = [];
  const rng = new Rng(5);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, at: THREE.Vector3, rotY = 0) => {
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(at);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  for (const stand of STANDS) {
    // Build as if the stand runs along x and climbs toward -z, then turn it into place.
    const turn = stand.axis === "z" ? (stand.climb < 0 ? 0 : Math.PI) : stand.climb < 0 ? Math.PI / 2 : -Math.PI / 2;
    const place = (along: number, out: number, y: number) => {
      const v = new THREE.Vector3(along, y, -out).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
      if (stand.axis === "z") v.z += stand.front;
      else v.x += stand.front;
      return v;
    };
    const length = stand.half * 2;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let r = 0; r < stand.rows; r++) {
      shape.lineTo(r * ROW_DEPTH, FIRST_ROW + r * ROW_RISE);
      shape.lineTo((r + 1) * ROW_DEPTH, FIRST_ROW + r * ROW_RISE);
    }
    shape.lineTo(stand.rows * ROW_DEPTH + 1, FIRST_ROW + stand.rows * ROW_RISE);
    shape.lineTo(stand.rows * ROW_DEPTH + 1, 0);
    shape.closePath();
    const body = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    // Shape x is the climb (out from the pitch), shape y is up, extrusion runs along the front.
    body.rotateY(Math.PI / 2);
    body.translate(-stand.half, 0, 0);
    add(body, concrete, place(0, 0, 0), turn);
    for (let r = 0; r < stand.rows; r++) {
      const y = FIRST_ROW + r * ROW_RISE;
      for (let a = -stand.half + 0.4; a < stand.half - 0.3; a += SPACING) {
        const section = stand.axis === "x" ? (stand.front < 0 ? 0 : 1) : a < 0 ? 0 : 1;
        if (rng.chance(0.07)) continue;
        const p = place(a, r * ROW_DEPTH + ROW_DEPTH * 0.55, y + 0.02);
        seats.push({ x: p.x, y: p.y, z: p.z, turn, side: section });
      }
      for (const [from, to, side] of [[-stand.half, 0, 0], [0, stand.half, 1]] as const) {
        const s = stand.axis === "x" ? (stand.front < 0 ? 0 : 1) : side;
        const bench = new THREE.BoxGeometry(to - from, 0.12, 0.34);
        add(bench, seatMats[s]!, place((from + to) / 2, r * ROW_DEPTH + ROW_DEPTH * 0.7, y + 0.28), turn);
      }
    }
    if (stand.roof) {
      const top = FIRST_ROW + stand.rows * ROW_RISE + 4.2;
      const depth = stand.rows * ROW_DEPTH + 4;
      add(new THREE.BoxGeometry(length + 2, 0.5, depth), roofMat, place(0, depth / 2 - 2.5, top), turn);
      add(new THREE.BoxGeometry(length, 0.12, 0.25), glow, place(0, -1.8, top - 0.3), turn);
      for (let a = -stand.half; a <= stand.half; a += 11.5) add(new THREE.BoxGeometry(0.35, top, 0.35), roofMat, place(a, stand.rows * ROW_DEPTH + 0.6, top / 2), turn);
    }
  }
  return {
    group,
    seats,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of [concrete, ...seatMats, roofMat, glow]) m.dispose();
    },
  };
}
