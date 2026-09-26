import { describe, expect, it } from "vitest";
import { FIGHT_RANGE, Footwork } from "./footwork";
import { seeded } from "./random";
import { edge } from "./ring-craft";

/** A round's worth of footwork with no punches, sampled every step. */
function moveAbout(styles: [string, string], ms: number, seed = 4) {
  const footwork = new Footwork(seeded(seed), styles);
  footwork.place(false);
  const gaps: number[] = [];
  const edges: [number[], number[]] = [[], []];
  let lateral = 0;
  for (let now = 0; now < ms; now += 16) {
    const before = Math.atan2(footwork.spots[1].x - footwork.spots[0].x, footwork.spots[1].z - footwork.spots[0].z);
    footwork.update(16, now);
    const after = Math.atan2(footwork.spots[1].x - footwork.spots[0].x, footwork.spots[1].z - footwork.spots[0].z);
    lateral += Math.abs(Math.atan2(Math.sin(after - before), Math.cos(after - before)));
    gaps.push(footwork.distance());
    edges[0].push(edge(footwork.spots[0]));
    edges[1].push(edge(footwork.spots[1]));
  }
  return { footwork, gaps, edges, lateral };
}

const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;

describe("footwork", () => {
  it("keeps the boxers in punching range and out of a clinch", () => {
    for (const styles of [["rocco", "kenji"], ["kenji", "kenji"], ["diego", "marcus"]] as [string, string][]) {
      const { gaps } = moveAbout(styles, 20_000);
      const settled = gaps.slice(200);
      expect(Math.min(...settled)).toBeGreaterThan(0.8);
      expect(Math.max(...settled)).toBeLessThan(FIGHT_RANGE + 0.6);
    }
  });

  it("circles, turning the pair around the ring", () => {
    const { lateral } = moveAbout(["marcus", "marcus"], 20_000);
    // Over half a turn of angle in a round, one way or the other.
    expect(lateral).toBeGreaterThan(Math.PI);
  });

  it("lets a pressure fighter walk an out boxer back toward the ropes", () => {
    const { edges } = moveAbout(["rocco", "kenji"], 30_000);
    // The one being stalked spends its time further out than the one stalking.
    expect(mean(edges[1])).toBeGreaterThan(mean(edges[0]));
  });

  it("fights an out boxer from further away than a swarmer", () => {
    const out = moveAbout(["kenji", "kenji"], 15_000);
    const swarm = moveAbout(["diego", "diego"], 15_000);
    expect(mean(out.gaps.slice(200))).toBeGreaterThan(mean(swarm.gaps.slice(200)) + 0.15);
  });

  it("steps back out after a combination", () => {
    const footwork = new Footwork(seeded(9), ["kenji", "kenji"]);
    footwork.place(false);
    for (let now = 0; now < 3000; now += 16) footwork.update(16, now);
    const before = footwork.distance();
    footwork.threw(0, 3000);
    footwork.threw(0, 3200);
    let widest = before;
    for (let now = 3200; now < 4400; now += 16) {
      footwork.update(16, now);
      widest = Math.max(widest, footwork.distance());
    }
    expect(widest).toBeGreaterThan(before + 0.15);
  });

  it("stays put, not NaN, for a zero step while giving ground after a combination", () => {
    // A player's punch flushes the match with a zero step. It used to divide the step back by it.
    const footwork = new Footwork(seeded(3), ["rocco", "marcus"]);
    footwork.place(false);
    footwork.threw(0, 0);
    footwork.threw(0, 100);
    footwork.update(16, 600);
    const before = footwork.spots.map((spot) => ({ ...spot }));
    footwork.update(0, 600);
    expect(footwork.spots).toEqual(before);
    footwork.update(16, 616);
    for (const spot of footwork.spots) expect(Number.isFinite(spot.x) && Number.isFinite(spot.z)).toBe(true);
  });
});
