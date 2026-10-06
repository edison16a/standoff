import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { merge, paint } from "../models/geo";
import { AISLE_EVERY, AISLE_WIDTH, FIRST_ROW, ROW_DEPTH, ROW_RISE, seats, STANDS, standTurn, type Seat, type StandSpec } from "./stand-layout";

const CONCRETE = "#3a3d45";
const STEP = "#4b4e57";
const SEAT_COLOURS = ["#6e1620", "#16306e"] as const;
const ROOF = "#454a55";
const STEEL = "#5d626d";

/** How high a stand's roof sits, and how far it reaches out over the front rows. */
export function roofOf(stand: StandSpec): { top: number; back: number; overhang: number } {
  return { top: FIRST_ROW + stand.rows * ROW_RISE + 4.6, back: stand.rows * ROW_DEPTH + 1, overhang: 2.2 };
}

/**
 * The stands in two draws: the concrete, the seats, the stairs, the
 * walls and the roofs in one merged mesh painted in its vertices, and
 * every strip light in another that glows. Each stand is built as if it
 * ran along x and climbed toward -z, then turned into place.
 */
export function buildStands(): { group: THREE.Group; seats: Seat[]; dispose(): void } {
  const solid: THREE.BufferGeometry[] = [];
  const lit: THREE.BufferGeometry[] = [];
  for (const stand of STANDS) {
    const into = new THREE.Matrix4().makeRotationY(standTurn(stand));
    into.setPosition(stand.axis === "x" ? stand.front : 0, 0, stand.axis === "z" ? stand.front : 0);
    const parts: THREE.BufferGeometry[] = [];
    const glow: THREE.BufferGeometry[] = [];
    terraces(stand, parts);
    if (stand.roof) roof(stand, parts, glow);
    for (const g of parts) solid.push(g.applyMatrix4(into));
    for (const g of glow) lit.push(g.applyMatrix4(into));
  }
  corners(solid);
  const structure = new THREE.MeshLambertMaterial({ vertexColors: true });
  // Strip lights burn well above white, so the finish blooms them.
  const lamps = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff2dc").multiplyScalar(5) });
  const body = new THREE.Mesh(merge(solid), structure);
  body.receiveShadow = true;
  const lights = new THREE.Mesh(merge(lit), lamps);
  const group = new THREE.Group();
  group.add(body, lights);
  return {
    group,
    seats: seats(),
    dispose() {
      body.geometry.dispose();
      lights.geometry.dispose();
      structure.dispose();
      lamps.dispose();
    },
  };
}

/** The stepped concrete, a row of seats on each step, the aisles' stairs, the front wall and the back wall. */
function terraces(stand: StandSpec, parts: THREE.BufferGeometry[]): void {
  const length = stand.half * 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, FIRST_ROW);
  for (let r = 0; r < stand.rows; r++) {
    shape.lineTo(r * ROW_DEPTH, FIRST_ROW + r * ROW_RISE);
    shape.lineTo((r + 1) * ROW_DEPTH, FIRST_ROW + r * ROW_RISE);
  }
  shape.lineTo(stand.rows * ROW_DEPTH + 1, FIRST_ROW + stand.rows * ROW_RISE);
  shape.lineTo(stand.rows * ROW_DEPTH + 1, 0);
  shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  // Shape x is out from the pitch (-z once turned), shape y is up; the extrusion runs along the front.
  body.rotateY(Math.PI / 2);
  body.translate(-stand.half, 0, 0);
  parts.push(paint(body, CONCRETE));
  const sides = stand.axis === "x" ? [stand.front < 0 ? 0 : 1] : [0, 1];
  for (let r = 0; r < stand.rows; r++) {
    const y = FIRST_ROW + r * ROW_RISE;
    const z = -(r * ROW_DEPTH + ROW_DEPTH * 0.72);
    // Seat runs between the aisles, in the colour of the end they face.
    for (let from = -stand.half; from < stand.half - 0.5; from += AISLE_EVERY) {
      const a = from + (from > -stand.half ? AISLE_WIDTH / 2 : 0.2);
      const b = Math.min(stand.half - 0.2, from + AISLE_EVERY - AISLE_WIDTH / 2);
      if (b - a < 0.5) continue;
      const side = sides.length === 1 ? sides[0]! : (a + b) / 2 < 0 ? 0 : 1;
      parts.push(paint(new THREE.BoxGeometry(b - a, 0.42, 0.42), SEAT_COLOURS[side]!, { at: [(a + b) / 2, y + 0.21, z] }));
    }
  }
  for (let along = -stand.half + AISLE_EVERY; along < stand.half - 1; along += AISLE_EVERY) {
    const depth = stand.rows * ROW_DEPTH;
    // The stairs: a lighter ramp up the aisle, with a handrail beside it.
    const ramp = paint(new THREE.BoxGeometry(AISLE_WIDTH, 0.12, Math.hypot(depth, stand.rows * ROW_RISE)), STEP);
    ramp.rotateX(Math.atan2(stand.rows * ROW_RISE, depth));
    ramp.translate(along, FIRST_ROW + (stand.rows * ROW_RISE) / 2 - 0.15, -depth / 2);
    parts.push(ramp);
  }
  const top = FIRST_ROW + stand.rows * ROW_RISE;
  parts.push(paint(new THREE.BoxGeometry(length, 1.1, 0.2), "#24262c", { at: [0, FIRST_ROW + 0.55, 0.1] }));
  const back = stand.roof ? roofOf(stand).top : top + 2.2;
  parts.push(paint(new THREE.BoxGeometry(length + 0.4, back, 0.5), "#2b2e36", { at: [0, back / 2, -(stand.rows * ROW_DEPTH + 1.25)] }));
}

/** A cantilevered roof: a slab, a deep fascia along its front edge with lights under it, and trusses back to the columns. */
function roof(stand: StandSpec, parts: THREE.BufferGeometry[], glow: THREE.BufferGeometry[]): void {
  const { top, back, overhang } = roofOf(stand);
  const length = stand.half * 2 + 1;
  const depth = back + overhang + 0.5;
  const slab = paint(new THREE.BoxGeometry(length, 0.35, depth), ROOF, { at: [0, top, -(back - overhang + 0.5) / 2 - 0.25] });
  slab.rotateX(-0.04);
  parts.push(slab);
  // A pale membrane on top, as the blimp shot sees it.
  const skin = paint(new THREE.BoxGeometry(length - 0.4, 0.05, depth - 0.4), "#7d828c", { at: [0, top + 0.2, -(back - overhang + 0.5) / 2 - 0.25] });
  skin.rotateX(-0.04);
  parts.push(skin);
  parts.push(paint(new THREE.BoxGeometry(length, 1.3, 0.3), "#1d1f25", { at: [0, top - 0.3, overhang] }));
  glow.push(paint(new THREE.BoxGeometry(length - 1, 0.1, 0.18), "#ffffff", { at: [0, top - 1.0, overhang - 0.05] }));
  // Downlights under the slab, two rows of them, which light the faces of the crowd.
  for (let a = -stand.half + 2; a < stand.half - 1; a += 4) {
    for (const z of [overhang - 1.2, -back * 0.45]) glow.push(paint(new THREE.BoxGeometry(0.5, 0.06, 0.5), "#ffffff", { at: [a, top - 0.22, z] }));
  }
  for (let a = -stand.half; a <= stand.half + 0.01; a += stand.half / Math.round(stand.half / 6)) {
    // Trusses: a top chord, a raking strut and a column at the back.
    parts.push(paint(new THREE.BoxGeometry(0.25, 0.25, depth), STEEL, { at: [a, top - 0.35, -(back - overhang) / 2] }));
    const strut = paint(new THREE.BoxGeometry(0.18, 0.18, Math.hypot(back + overhang, 3.2)), STEEL);
    strut.rotateX(-Math.atan2(3.2, back + overhang));
    strut.translate(a, top - 1.95, -(back - overhang) / 2);
    parts.push(strut);
  }
}

/** Concrete blocks filling the corners between the stands, where the floodlight towers stand. */
function corners(parts: THREE.BufferGeometry[]): void {
  const x = PITCH.halfLength + 10.5;
  const z = PITCH.halfWidth + 9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(paint(new THREE.BoxGeometry(8, 5, 8), "#24262d", { at: [sx * x, 2.5, sz * z] }));
}
