import { describe, expect, it } from "vitest";
import { TRACKS } from "../tracks";
import { OVAL } from "./test-track";
import { Track } from "./track";

describe("Track", () => {
  const track = new Track(OVAL);

  it("starts at the first control point, heading toward the second", () => {
    const f = track.frameAt(0);
    expect(f.x).toBeCloseTo(0, 1);
    expect(f.z).toBeCloseTo(0, 1);
    expect(f.tz).toBeGreaterThan(0.9);
  });

  it("finds a point's distance along the lap and its side", () => {
    const f = track.frameAt(50);
    // Heading +z, the right hand side is -x.
    expect(f.rx).toBeLessThan(-0.9);
    const right = track.locate(f.x + f.rx * 3, f.z + f.rz * 3, -1);
    expect(right.s).toBeCloseTo(50, 0);
    expect(right.d).toBeCloseTo(3, 1);
    const left = track.locate(f.x - f.rx * 3, f.z - f.rz * 3, track.indexAt(50));
    expect(left.d).toBeCloseTo(-3, 1);
  });

  it("measures short forward and backward distances across the finish line", () => {
    expect(track.forward(track.length - 5, 5)).toBeCloseTo(10);
    expect(track.forward(5, track.length - 5)).toBeCloseTo(-10);
  });

  it("marks bends by direction", () => {
    // The oval runs anticlockwise seen from above: +z round to +x is a left turn.
    const top = track.frameAt(track.locate(40, 140, -1).s);
    expect(top.bend).toBeLessThan(0);
  });

  it("has ground on the road and on a walled edge, and none on an open one", () => {
    expect(track.groundAt(10, 0)).not.toBeNull();
    expect(track.groundAt(10, track.edge + 3)).not.toBeNull();
    const open = new Track({ ...OVAL, openEdges: [{ from: 0, to: 0.2, side: "right" }] });
    expect(open.groundAt(10, open.edge + 3)).toBeNull();
    expect(open.groundAt(10, -open.edge - 3)).not.toBeNull();
    expect(open.hasWall(10, 1)).toBe(false);
    expect(open.hasWall(10, -1)).toBe(true);
  });

  it("lifts the road up a ramp and leaves a hole after the lip", () => {
    const jump = new Track({ ...OVAL, ramps: [{ at: 0.2, length: 10, height: 2 }], gaps: [{ at: 0.2, length: 8 }] });
    const lip = jump.ramps[0]!.end;
    expect(jump.rampHeight(lip - 5)).toBeGreaterThan(0.5);
    expect(jump.rampHeight(lip)).toBeCloseTo(2);
    expect(jump.groundAt(lip + 4, 0)).toBeNull();
    expect(jump.groundAt(lip + 12, 0)).not.toBeNull();
  });
});

describe("the maps", () => {
  it.each(TRACKS.map((def) => [def.name, def] as const))("%s is a sensible length and never runs into itself", (_, def) => {
    const track = new Track(def);
    expect(track.length).toBeGreaterThan(800);
    expect(track.length).toBeLessThan(1600);
    const pts = track.points;
    let closest = Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      for (let j = i + 90; j < pts.length; j += 3) {
        if (pts.length - j + i < 90) continue;
        closest = Math.min(closest, Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.z - pts[j]!.z));
      }
    }
    // Two stretches of road never come close enough for their barriers to touch.
    expect(closest).toBeGreaterThan(track.edge * 2 + 10);
  });
});
