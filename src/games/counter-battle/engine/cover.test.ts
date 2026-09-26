import { describe, expect, it } from "vitest";
import { onField, PIECES, pieceDistance, spawnPoints } from "./arena";
import { fieldGraph } from "./battle";
import { hiddenFrom, MAX_RUN, nearestSpot } from "./cover";
import { pathBlocked } from "./geometry";
import { routesFrom, routeTo } from "./path";
import { BODY } from "./tuning";
import { dist } from "./vec";

const graph = fieldGraph();

describe("the cover graph", () => {
  it("has spots around every piece, none inside one or off the field", () => {
    expect(graph.spots.length).toBeGreaterThan(150);
    for (const piece of PIECES) expect(graph.spots.some((s) => s.piece === piece.id)).toBe(true);
    for (const s of graph.spots) {
      expect(onField(s.pos)).toBe(true);
      for (const p of PIECES) expect(pieceDistance(p, s.pos)).toBeGreaterThanOrEqual(BODY.radius);
    }
  });

  it("is mirrored like the field", () => {
    for (const s of graph.spots) {
      const twin = graph.spots.find((o) => Math.abs(o.pos.x + s.pos.x) < 1e-6 && Math.abs(o.pos.z + s.pos.z) < 1e-6);
      expect(twin).toBeDefined();
      expect(twin!.tall).toBe(s.tall);
      expect(graph.edges[twin!.id]!.length).toBe(graph.edges[s.id]!.length);
    }
  });

  it("only has short, clear runs, and joins every spot to every other", () => {
    for (const [i, edges] of graph.edges.entries()) {
      for (const e of edges) {
        expect(e.length).toBeLessThanOrEqual(MAX_RUN);
        expect(pathBlocked(graph.spots[i]!.pos, graph.spots[e.to]!.pos, PIECES, BODY.radius)).toBe(false);
      }
    }
    const routes = routesFrom(graph, 0);
    expect([...routes.cost].every(Number.isFinite)).toBe(true);
  });

  it("routes along runs from one end to the other", () => {
    const from = nearestSpot(graph, spawnPoints(0, 1)[0]!, PIECES);
    const to = nearestSpot(graph, spawnPoints(1, 1)[0]!, PIECES);
    const route = routeTo(routesFrom(graph, from), to)!;
    expect(route.at(-1)).toBe(to);
    let at = from;
    for (const next of route) {
      expect(graph.edges[at]!.some((e) => e.to === next)).toBe(true);
      at = next;
    }
  });

  it("makes the start points spots of their own", () => {
    for (const side of [0, 1] as const) {
      for (const p of spawnPoints(side, 2)) expect(dist(graph.spots[nearestSpot(graph, p, PIECES)]!.pos, p)).toBeLessThan(1e-6);
    }
  });

  it("knows a spot behind a bunker is hidden from the far side and not from beside it", () => {
    const can = PIECES.find((p) => p.kind === "can")!;
    const behind = graph.spots.find((s) => s.piece === can.id && s.out.z < -0.9)!;
    const far = { x: behind.pos.x, y: BODY.standEye, z: can.z + 15 };
    const beside = { x: behind.pos.x + 12, y: BODY.standEye, z: behind.pos.z };
    expect(hiddenFrom(behind.pos, false, far, PIECES)).toBe(true);
    expect(hiddenFrom(behind.pos, false, beside, PIECES)).toBe(false);
  });

  it("hides a crouched fighter behind low cover but not a standing one", () => {
    const cake = PIECES.find((p) => p.kind === "cake" && p.z < -5)!;
    const behind = graph.spots.find((s) => s.piece === cake.id && s.out.z < -0.9)!;
    const eye = { x: behind.pos.x, y: BODY.standEye, z: cake.z + 14 };
    expect(hiddenFrom(behind.pos, true, eye, PIECES)).toBe(true);
    expect(hiddenFrom(behind.pos, false, eye, PIECES)).toBe(false);
  });
});
