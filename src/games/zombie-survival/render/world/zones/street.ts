import { buildingRow } from "../buildings";
import { barrel, car, dumpster, hydrant, streetLamp, trashBags } from "../props";
import { SEGMENTS } from "../../../engine/route";
import { groundSpan, OUTER, type SegmentKit } from "../segment-kit";

const PAVEMENT = 3;

/** Road with a centre line, pavements with curbs, and the markings every city street has. */
export function roadway(kit: SegmentKit, pavement = PAVEMENT): [number, number] {
  const { m, hw, seg } = kit;
  const [a0, a1] = groundSpan(seg);
  const outer = hw + pavement;
  kit.ground(-hw, hw, a0, a1, m.road, 6);
  if (a1 > seg.length) kit.ground(-outer, outer, seg.length, a1, m.road, 6, 0.002);
  kit.ground(hw, outer, a0, seg.length, m.sidewalk, 2, 0.15);
  kit.ground(-outer, -hw, a0, seg.length, m.sidewalk, 2, 0.15);
  for (const s of [-1, 1]) {
    for (let a = a0; a < seg.length; a += 4) kit.b.box(0.22, 0.17, 4, m.curb, kit.at(s * (hw + 0.11), a + 2, 0.07));
  }
  for (let a = a0 + 2; a < seg.length - 2; a += 6) kit.b.box(0.14, 0.02, 3, m.paint, kit.at(0, a, 0.012));
  for (const s of [-1, 1]) kit.b.box(0.12, 0.02, seg.length - a0, m.whitePaint, kit.at(s * (hw - 0.4), (a0 + seg.length) / 2, 0.012));
  return [a0, a1];
}

/**
 * A city street: road and pavements, a row of buildings on each side,
 * street lamps (some failing), parked and wrecked cars, bins, bags and
 * the odd burning barrel.
 */
export function buildStreet(kit: SegmentKit): void {
  const { hw, seg, rand } = kit;
  const [a0] = roadway(kit);
  const inner = hw + PAVEMENT + 0.3;
  buildingRow(kit, 1, inner, a0 - 6, seg.length + 6);
  buildingRow(kit, -1, inner, a0 - 6, seg.length + 6);
  for (let a = a0 + 6, i = 0; a < seg.length; a += 15, i++) streetLamp(kit, (i % 2 ? 1 : -1) * (hw + 0.5), a);
  for (let i = 0; i < 3; i++) {
    const s = rand() < 0.5 ? -1 : 1;
    const a = a0 + 5 + rand() * (seg.length - a0 - 10);
    const wrecked = rand() < 0.35;
    car(kit, s * (hw - 1.3), a, Math.PI / 2 + (wrecked ? (rand() - 0.5) * 0.9 : 0), wrecked);
  }
  dumpster(kit, (rand() < 0.5 ? -1 : 1) * (hw + 2), a0 + 8 + rand() * 20, Math.PI / 2);
  trashBags(kit, (rand() < 0.5 ? -1 : 1) * (hw + 1.6), a0 + 4 + rand() * 30);
  hydrant(kit, (rand() < 0.5 ? -1 : 1) * (hw + 0.6), a0 + 3 + rand() * 30);
  if (rand() < 0.6) barrel(kit, (rand() < 0.5 ? -1 : 1) * (hw + 1.5), a0 + 10 + rand() * 25, true);
  closeTheView(kit);
}

/** Where the road turns away, a building straight ahead closes the view like a real T junction. */
export function closeTheView(kit: SegmentKit): void {
  const next = SEGMENTS[kit.seg.index];
  if (!next || Math.abs(next.heading - kit.seg.heading) < 1e-3) return;
  const along = kit.seg.length + OUTER[next.zone] + 8;
  if (kit.free(0, along, 9)) kit.block(22, 14 + kit.rand() * 12, 14, kit.m.facades[kit.seg.index % 3]!, 0, along);
}
