import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { NetDent, NetsView } from "../../engine/net-view";
import { PITCH } from "../../engine/tuning";
import { breeze, GoalModel } from "./goal-model";
import { PANELS } from "../../engine/physics/net-panels";

const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;
const GD = PITCH.goalDepth;

const still = (): NetDent => ({ u: 0, v: 0, depth: 0 });
const dented = (back: NetDent): NetsView[number] => ({ back, left: still(), right: still(), roof: still() });

/** The drawn back of the net's vertices, in the world. */
function backNet(goal: GoalModel): THREE.Vector3[] {
  const mesh = goal.group.children[1] as THREE.Mesh;
  const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  return Array.from({ length: pos.count }, (_, i) => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
}

describe("the drawn goal", () => {
  it("bulges the back of the net exactly where and as far as the simulation's sheet was pushed", () => {
    const goal = new GoalModel(1, new THREE.Texture());
    goal.update(dented({ u: GW + 1, v: 1.2, depth: 0.6 }), 1 / 60);
    const verts = backNet(goal);
    const at = verts.reduce((best, v) => (Math.hypot(v.z - 1, v.y - 1.2) < Math.hypot(best.z - 1, best.y - 1.2) ? v : best));
    expect(at.x).toBeGreaterThan(HL + GD + 0.55);
    // Tied to the frame: the edges stay on it.
    for (const v of verts) if (Math.abs(Math.abs(v.z) - GW) < 1e-6 || v.y < 1e-6) expect(v.x).toBeCloseTo(HL + GD, 5);
    goal.dispose();
  });

  it("rings when the ball hits the woodwork, and the ring dies away", () => {
    const goal = new GoalModel(-1, new THREE.Texture());
    const rest = dented(still());
    goal.ring(25);
    let most = 0;
    for (let t = 0; t < 0.3; t += 1 / 60) {
      goal.update(rest, 1 / 60);
      most = Math.max(most, goal.group.position.length());
    }
    expect(most).toBeGreaterThan(0.005);
    for (let t = 0; t < 3; t += 1 / 60) goal.update(rest, 1 / 60);
    expect(goal.group.position.length()).toBeLessThan(1e-4);
    goal.dispose();
  });

  it("stirs in the breeze by a centimetre or so, never where it is tied", () => {
    const { w, h } = PANELS.back;
    let most = 0;
    for (let t = 0; t < 10; t += 0.37) {
      most = Math.max(most, Math.abs(breeze("back", w / 2, h / 2, t)));
      expect(breeze("back", 0, h / 2, t)).toBeCloseTo(0, 9);
      expect(breeze("back", w / 2, 0, t)).toBeCloseTo(0, 9);
    }
    expect(most).toBeGreaterThan(0.005);
    expect(most).toBeLessThan(0.02);
  });
});
