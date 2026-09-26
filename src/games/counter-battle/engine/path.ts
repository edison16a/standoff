import type { CoverGraph } from "./cover";

export interface Routes {
  /** Travel cost from the start to every spot, Infinity where unreachable. */
  cost: Float64Array;
  /** The spot each one is reached from, -1 at the start. */
  prev: Int32Array;
}

/**
 * Cheapest routes from one spot to all the others. `extra` adds a cost to
 * a run, which the planner uses to steer away from runs the enemy can see.
 * The graph has a few hundred spots, so a plain scan beats a heap.
 */
export function routesFrom(graph: CoverGraph, start: number, extra?: (from: number, to: number) => number): Routes {
  const n = graph.spots.length;
  const cost = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  cost[start] = 0;
  for (;;) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!done[i] && cost[i]! < best) {
        best = cost[i]!;
        u = i;
      }
    }
    if (u < 0) break;
    done[u] = 1;
    for (const edge of graph.edges[u]!) {
      const c = best + edge.length + (extra ? extra(u, edge.to) : 0);
      if (c < cost[edge.to]!) {
        cost[edge.to] = c;
        prev[edge.to] = u;
      }
    }
  }
  return { cost, prev };
}

/** The spots along the route to `goal`, start excluded, or null if it cannot be reached. */
export function routeTo(routes: Routes, goal: number): number[] | null {
  if (!Number.isFinite(routes.cost[goal]!)) return null;
  const out: number[] = [];
  for (let at = goal; routes.prev[at]! >= 0; at = routes.prev[at]!) out.push(at);
  return out.reverse();
}
