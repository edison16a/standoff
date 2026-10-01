import { describe, expect, it } from "vitest";
import { PIECES } from "./arena";
import { fieldGraph } from "./battle";
import type { BrainWorld } from "./brain";
import { nearestSpot } from "./cover";
import { MAX_HOP, MIN_HOP, pickHop, type Hop } from "./engage";
import type { Fighter } from "./fighter";
import { routesFrom } from "./path";
import { Rng } from "./rng";
import { fighterAt } from "./test-helpers";
import { dist, type V2 } from "./vec";

const graph = fieldGraph();

/** A fighter standing on the spot nearest `at`, one enemy at `foe`, and the world they plan in. */
function scene(at: V2, foe: V2, mates: V2[] = []): { f: Fighter; enemy: Fighter; here: number; world: (seed: number) => BrainWorld } {
  const f = fighterAt(0, 0, at.x, at.z, "smg");
  const here = nearestSpot(graph, at, PIECES);
  f.pos = { ...graph.spots[here]!.pos };
  f.brain.spot = here;
  const enemy = fighterAt(1, 1, foe.x, foe.z, "rifle");
  const world = (seed: number): BrainWorld => ({
    graph,
    pieces: PIECES,
    enemies: [enemy],
    claimed: mates,
    mates,
    others: [enemy.pos, ...mates],
    pressure: 0,
    rng: new Rng(seed),
    engaged: false,
    pace: 1,
    human: false,
  });
  return { f, enemy, here, world };
}

const SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe("picking the next hop", () => {
  it("runs a short way along the cover graph, never onto someone", () => {
    const { f, here, world } = scene({ x: -4, z: -9 }, { x: 2, z: 4 });
    const cost = routesFrom(graph, here).cost;
    for (const seed of SEEDS) {
      const w = world(seed);
      const hop = pickHop(f, w, here, false)!;
      expect(hop.route.at(-1)).toBe(hop.spot);
      expect(cost[hop.spot]).toBeGreaterThanOrEqual(MIN_HOP);
      expect(cost[hop.spot]).toBeLessThanOrEqual(MAX_HOP);
      for (const o of w.others) expect(dist(graph.spots[hop.spot]!.pos, o)).toBeGreaterThan(1.2);
    }
  });

  it("closes in from far off", () => {
    const { f, enemy, here, world } = scene({ x: 3, z: -24 }, { x: -2, z: 10 });
    const start = dist(f.pos, enemy.pos);
    const gains = SEEDS.map((seed) => start - dist(graph.spots[pickHop(f, world(seed), here, false)!.spot]!.pos, enemy.pos));
    for (const g of gains) expect(g).toBeGreaterThan(1.5);
  });

  it("backs off a little while reloading or hurt", () => {
    const { f, enemy, here, world } = scene({ x: -4, z: -2 }, { x: 2, z: 7 });
    const away = (backing: boolean) => mean(SEEDS.map((seed) => dist(graph.spots[pickHop(f, world(seed), here, backing)!.spot]!.pos, enemy.pos)));
    expect(away(true) - away(false)).toBeGreaterThan(2);
  });

  it("goes round the other way when told to circle the other way", () => {
    const { f, here, world } = scene({ x: -6, z: -4 }, { x: 0, z: 8 });
    const arcs = (orbit: 1 | -1) => {
      f.brain.orbit = orbit;
      return SEEDS.map((seed) => pickHop(f, world(seed), here, false)!).map((h: Hop) => h.arc);
    };
    expect(mean(arcs(1))).toBeGreaterThan(1);
    expect(mean(arcs(-1))).toBeGreaterThan(1);
  });

  it("keeps clear of a teammate standing where it would have gone", () => {
    const { f, here, world } = scene({ x: -4, z: -9 }, { x: 2, z: 4 });
    for (const seed of SEEDS) {
      const alone = graph.spots[pickHop(f, world(seed), here, false)!.spot]!.pos;
      const crowded = scene({ x: -4, z: -9 }, { x: 2, z: 4 }, [alone]);
      const hop = pickHop(crowded.f, crowded.world(seed), crowded.here, false)!;
      expect(dist(graph.spots[hop.spot]!.pos, alone)).toBeGreaterThan(3);
    }
  });
});
