import { describe, expect, it } from "vitest";
import { seeded } from "../rng";
import type { LayupKind } from "../types";
import type { Approach, Spot, Threat } from "./approach";
import { selectFinish } from "./select";

const OPEN: Approach = {
  angle: "front", speed: 3.6, fast: false, distance: 2.6, hand: 1, threat: null, open: true, canDunk: true,
  putback: false, alley: false, bounce: 6, strength: 6, signature: "flush",
};

function threat(spot: Spot, over: Partial<Threat> = {}): Threat {
  const lateral = spot === "ballSide" ? 0.8 : spot === "offSide" ? -0.8 : 0;
  return { id: 3, dist: 1.2, spot, lateral, tall: false, up: false, edge: 0, ...over };
}

/** How often each finish comes up over many tries of the same approach. */
function spread(ap: Approach, n = 400): Map<string, number> {
  const rng = seeded(11);
  const out = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const c = selectFinish(rng, ap);
    const key = c.dunk ? `dunk:${c.style}` : `layup:${c.layup}`;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

const layups = (m: Map<string, number>) => [...m.keys()].filter((k) => k.startsWith("layup:")).map((k) => k.slice(6) as LayupKind);

describe("picking the finish", () => {
  it("always dunks with space, and lays it up with a man close", () => {
    for (const k of spread(OPEN).keys()) expect(k.startsWith("dunk:")).toBe(true);
    const crowded = { ...OPEN, open: false, threat: threat("path") };
    for (const k of spread(crowded).keys()) expect(k.startsWith("layup:")).toBe(true);
  });

  it("lays it up when the body cannot get up to the rim, even with space", () => {
    for (const k of spread({ ...OPEN, canDunk: false, distance: 0.6 }).keys()) expect(k.startsWith("layup:")).toBe(true);
  });

  it("goes with two hands alone at the rim, and one hand smashes with speed", () => {
    const settled = spread(OPEN);
    expect(Math.max(...settled.values())).toBe(settled.get("dunk:twoHand"));
    const fast = spread({ ...OPEN, speed: 5.4, fast: true, strength: 8 });
    expect(fast.has("dunk:twoHand")).toBe(false);
    expect((fast.get("dunk:tomahawk") ?? 0) + (fast.get("dunk:cockback") ?? 0)).toBeGreaterThan(150);
  });

  it("dunks off a jump stop when walking into it, and reverses along the baseline", () => {
    expect([...spread({ ...OPEN, speed: 1.9 }).keys()]).toEqual(["dunk:jumpStop"]);
    const baseline = spread({ ...OPEN, angle: "baseline" });
    expect(Math.max(...baseline.values())).toBe(baseline.get("dunk:reverse"));
  });

  it("puts back an offensive board and throws down an alley oop", () => {
    expect([...spread({ ...OPEN, putback: true }).keys()]).toEqual(["dunk:putback"]);
    expect([...spread({ ...OPEN, alley: true }).keys()]).toEqual(["dunk:alley"]);
    expect([...spread({ ...OPEN, putback: true, open: false, threat: threat("trail") }).keys()]).toEqual(["layup:power"]);
  });

  it("posters a much smaller man waiting at the rim", () => {
    const big = { ...OPEN, open: false, strength: 9, threat: threat("rim", { edge: 3 }) };
    expect([...spread(big).keys()]).toEqual(["dunk:poster"]);
    // Not one who is already in the air, or level on strength.
    expect(layups(spread({ ...big, threat: threat("rim", { edge: 3, up: true }) })).length).toBeGreaterThan(0);
    expect(layups(spread({ ...big, threat: threat("rim", { edge: 0 }) })).length).toBeGreaterThan(0);
  });

  it("from the front floats a finger roll, from the side under the glass reverses along the baseline", () => {
    const front = spread({ ...OPEN, canDunk: false, distance: 1.8 });
    expect([...front.keys()]).toEqual(["layup:finger"]);
    expect([...spread({ ...OPEN, canDunk: false, angle: "baseline" }).keys()]).toEqual(["layup:reverse"]);
    expect(layups(spread({ ...OPEN, canDunk: false, angle: "side" }))).toContain("glass");
  });

  it("goes round a man in the way: a euro step at speed, an up and under or a spin up close", () => {
    expect(layups(spread({ ...OPEN, open: false, fast: true, threat: threat("path", { dist: 1.6 }) }))).toContain("euro");
    const close = layups(spread({ ...OPEN, open: false, threat: threat("path", { dist: 1.0 }) }));
    expect(close).toContain("upUnder");
    expect(close).toContain("spin");
  });

  it("shields with the body from a man on the ball side, scoops round one on the other side", () => {
    const ballSide = spread({ ...OPEN, open: false, threat: threat("ballSide") });
    expect(Math.max(...ballSide.values())).toBe(ballSide.get("layup:shield"));
    const offSide = spread({ ...OPEN, open: false, threat: threat("offSide") });
    expect(Math.max(...offSide.values())).toBe(offSide.get("layup:scoop"));
  });

  it("puts the ball in the hand away from the man and steps away from him", () => {
    const rng = seeded(3);
    const right = selectFinish(rng, { ...OPEN, open: false, threat: threat("ballSide", { lateral: 0.9 }) }, { layup: "shield" });
    expect(right.hand).toBe(-1);
    expect(right.side).toBe(-1);
    const left = selectFinish(rng, { ...OPEN, open: false, threat: threat("offSide", { lateral: -0.9 }) }, { layup: "euro" });
    expect(left.side).toBe(1);
  });

  it("floats it over a big man at the rim from out, and gets it up early from a man chasing", () => {
    expect([...spread({ ...OPEN, open: false, distance: 2.3, threat: threat("rim", { tall: true }) }).keys()]).toEqual(["layup:teardrop"]);
    const chased = spread({ ...OPEN, open: false, threat: threat("trail") });
    expect(Math.max(...chased.values())).toBe(chased.get("layup:wrongFoot"));
  });

  it("can reach every layup and every dunk somewhere", () => {
    const seen = new Set<string>();
    const ways: Approach[] = [
      OPEN, { ...OPEN, fast: true, speed: 5.5, bounce: 9, strength: 8 }, { ...OPEN, angle: "baseline", fast: true, bounce: 9 },
      { ...OPEN, speed: 1.9 }, { ...OPEN, putback: true }, { ...OPEN, alley: true }, { ...OPEN, strength: 9, open: false, threat: threat("rim", { edge: 3 }) },
      ...(["path", "rim", "ballSide", "offSide", "trail"] as const).flatMap((s) => [
        { ...OPEN, open: false, threat: threat(s) }, { ...OPEN, open: false, fast: true, angle: "side" as const, threat: threat(s, { dist: 1.6 }) },
        { ...OPEN, open: false, distance: 2.3, threat: threat(s, { up: true }) }, { ...OPEN, open: false, angle: "side" as const, threat: threat(s) },
      ]),
      { ...OPEN, canDunk: false, angle: "baseline" }, { ...OPEN, canDunk: false, speed: 2 },
    ];
    for (const ap of ways) for (const k of spread(ap, 200).keys()) seen.add(k);
    expect([...seen].filter((k) => k.startsWith("layup:")).length).toBe(11);
    expect([...seen].filter((k) => k.startsWith("dunk:")).length).toBeGreaterThanOrEqual(13);
  });
});
