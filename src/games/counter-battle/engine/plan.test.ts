import { describe, expect, it } from "vitest";
import { PIECES } from "./arena";
import { fieldGraph } from "./battle";
import { hiddenFrom, nearestSpot } from "./cover";
import type { Fighter } from "./fighter";
import type { GunId } from "./guns";
import { chooseSpot } from "./plan";
import { Rng } from "./rng";
import { fighterAt } from "./test-helpers";
import { BODY } from "./tuning";
import { dist, type V2 } from "./vec";

const graph = fieldGraph();

/** A fighter holding the spot nearest a point. */
function holding(id: number, team: 0 | 1, at: V2, gun: GunId): Fighter {
  const f = fighterAt(id, team, at.x, at.z, gun);
  f.brain.spot = nearestSpot(graph, at, PIECES);
  f.pos = { ...graph.spots[f.brain.spot]!.pos };
  return f;
}

/** Where a fighter chooses to go against enemies at `foes`, over a few random draws. */
function choices(gun: GunId, from: V2, foes: V2[], pressure = 0, claimed: V2[] = [], held = 0) {
  const out = [];
  for (let seed = 1; seed <= 6; seed++) {
    const f = holding(0, 0, from, gun);
    f.brain.held = held;
    const enemies = foes.map((p, i) => holding(10 + i, 1, p, "rifle"));
    const plan = chooseSpot({ f, enemies, claimed, others: [], graph, pieces: PIECES, pressure, rng: new Rng(seed) });
    const spot = graph.spots[plan.spot]!;
    out.push({ spot, plan, near: Math.min(...enemies.map((e) => dist(spot.pos, e.pos))), f, enemies });
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const FROM = { x: 0, z: -15 };
const FOES = [{ x: -4, z: 14 }, { x: 5, z: 12 }];

describe("choosing cover", () => {
  it("keeps the range each gun likes: sniper far, rifle long, SMG mid, shotgun close", () => {
    const range = (gun: GunId) => mean(choices(gun, FROM, FOES).map((c) => c.near));
    const sniper = range("sniper");
    const rifle = range("rifle");
    const smg = range("smg");
    const shotgun = range("shotgun");
    expect(sniper).toBeGreaterThan(rifle - 1);
    expect(rifle).toBeGreaterThan(smg);
    // From here both short guns make for the same centre bunker; the shotgun never hangs back.
    expect(shotgun).toBeLessThan(smg + 1);
    expect(shotgun).toBeLessThan(rifle - 5);
    expect(sniper).toBeGreaterThan(22);
    expect(shotgun).toBeLessThan(18);
  });

  it("closes in as pressure builds", () => {
    for (const gun of ["rifle", "sniper"] as const) {
      const calm = mean(choices(gun, FROM, FOES, 0).map((c) => c.near));
      const late = mean(choices(gun, FROM, FOES, 1).map((c) => c.near));
      expect(late).toBeLessThan(calm - 3);
    }
  });

  it("picks cover that hides it from the enemy when the round is young", () => {
    const hidden = choices("rifle", FROM, FOES).filter(({ spot, enemies }) =>
      enemies.some((e) => hiddenFrom(spot.pos, !spot.tall, { x: e.pos.x, y: BODY.standEye, z: e.pos.z }, PIECES)),
    );
    expect(hidden.length).toBeGreaterThanOrEqual(5);
  });

  it("spreads away from where a teammate is going", () => {
    const alone = choices("smg", FROM, FOES);
    for (const c of alone) {
      const beside = chooseSpot({ f: c.f, enemies: c.enemies, claimed: [c.spot.pos], others: [], graph, pieces: PIECES, pressure: 0, rng: new Rng(2) });
      expect(dist(graph.spots[beside.spot]!.pos, c.spot.pos)).toBeGreaterThan(3);
    }
  });

  it("gets restless at a spot it has held a long time", () => {
    const f = holding(0, 0, { x: 0, z: -10 }, "smg");
    const start = f.brain.spot;
    const enemies = FOES.map((p, i) => holding(10 + i, 1, p, "rifle"));
    f.brain.held = 60;
    const plan = chooseSpot({ f, enemies, claimed: [], others: [], graph, pieces: PIECES, pressure: 0, rng: new Rng(1) });
    expect(plan.spot).not.toBe(start);
  });

  it("routes only along runs, starting from the current spot", () => {
    for (const c of choices("shotgun", FROM, FOES)) {
      let at = c.f.brain.spot;
      for (const next of c.plan.route) {
        expect(graph.edges[at]!.some((e) => e.to === next)).toBe(true);
        at = next;
      }
      expect(at).toBe(c.plan.spot);
    }
  });

  it("sends the shotgun round the side more than the sniper", () => {
    const flank = (gun: GunId) => mean(choices(gun, FROM, FOES, 0.4).map((c) => Math.abs(c.spot.pos.x)));
    expect(flank("shotgun") + flank("smg")).toBeGreaterThan(flank("sniper"));
  });
});
