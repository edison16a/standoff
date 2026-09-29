import { describe, expect, it } from "vitest";
import { layRoute, PLAYBOOK, routeDone, routeTarget } from "./routes";
import { ROUTE_KINDS } from "./route-types";
import { add, norm, sub, v2 } from "./vec";

/** Walks a runner along a route at a steady pace and returns where they went. */
function runRoute(kind: (typeof ROUTE_KINDS)[number], team: 0 | 1, startZ: number) {
  const route = layRoute(kind, team, 0, 0, v2(team === 0 ? -1 : 1, startZ));
  let pos = v2(team === 0 ? -1 : 1, startZ);
  const path = [pos];
  for (let i = 0; i < 400; i++) {
    const t = routeTarget(route, pos);
    if (!t) break;
    pos = add(pos, norm(sub(t, pos)), 0.1);
    path.push(pos);
  }
  return { route, path, end: pos };
}

describe("routes", () => {
  it("go deep, cut in, cut out and cross as drawn", () => {
    const right = 9;
    expect(runRoute("go", 0, right).end.x).toBeGreaterThan(30);
    expect(runRoute("slant", 0, right).end.z).toBeLessThan(right - 4);
    expect(runRoute("out", 0, right).end.z).toBeGreaterThan(right + 6);
    expect(runRoute("drag", 0, right).end.z).toBeLessThan(-5);
    expect(runRoute("post", 0, right).end.x).toBeGreaterThan(20);
  });

  it("mirror for the team attacking the other way and the other side", () => {
    const red = runRoute("out", 0, 9).end;
    const blue = runRoute("out", 1, -9).end;
    expect(blue.x).toBeCloseTo(-red.x, 5);
    expect(blue.z).toBeCloseTo(-red.z, 5);
  });

  it("settles a curl facing back, turned toward the line", () => {
    const { route, path } = runRoute("curl", 0, 9);
    expect(routeDone(route)).toBe(true);
    const deepest = Math.max(...path.map((p) => p.x));
    expect(deepest).toBeGreaterThan(9);
    expect(path[path.length - 1]!.x).toBeLessThan(deepest);
  });

  it("stays on the field near a sideline", () => {
    for (const kind of ROUTE_KINDS) for (const p of runRoute(kind, 0, 25).path) expect(Math.abs(p.z)).toBeLessThan(160 / 6);
  });

  it("has a playbook of real route pairs", () => {
    for (const play of PLAYBOOK) for (const r of play) expect(ROUTE_KINDS).toContain(r);
  });
});
