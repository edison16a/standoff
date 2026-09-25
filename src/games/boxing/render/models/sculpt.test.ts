import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { round, sculpt } from "./sculpt";

const TUBE = [round(0, 0.1, 0.05), round(1, -0.1, 0.04)];

/** The outward normal of every triangle that touches the vertex at `index`. */
function faceNormals(geometry: THREE.BufferGeometry, index: number): THREE.Vector3[] {
  const position = geometry.getAttribute("position");
  const order = geometry.getIndex()!;
  const out: THREE.Vector3[] = [];
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < order.count; i += 3) {
    const tri = [order.getX(i), order.getX(i + 1), order.getX(i + 2)];
    if (!tri.includes(index)) continue;
    a.fromBufferAttribute(position, tri[0]!);
    b.fromBufferAttribute(position, tri[1]!);
    c.fromBufferAttribute(position, tri[2]!);
    out.push(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize());
  }
  return out;
}

describe("sculpted parts", () => {
  it("closes both ends with caps facing out, so no joint shows a hole", () => {
    const rows = 4;
    const segments = 8;
    const geometry = sculpt(TUBE, { rows, segments });
    const grid = (rows + 1) * (segments + 1);
    const top = grid;
    const bottom = grid + segments + 2;
    expect(geometry.getAttribute("position").count).toBe(grid + 2 * (segments + 2));
    expect(faceNormals(geometry, top).every((n) => n.y > 0.99)).toBe(true);
    expect(faceNormals(geometry, bottom).every((n) => n.y < -0.99)).toBe(true);
  });

  it("leaves a shell cut at a hairline open", () => {
    const geometry = sculpt(TUBE, { rows: 4, segments: 8, until: () => 0.5 });
    expect(geometry.getAttribute("position").count).toBe(5 * 9);
  });
});
