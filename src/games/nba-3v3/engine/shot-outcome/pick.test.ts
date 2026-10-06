import { describe, expect, it } from "vitest";
import { seeded } from "../rng";
import { pickPreset, type ShotQuality } from "./pick";
import { PRESETS, isMakePreset, type ShotPreset } from "./presets";

const N = 20000;
const JUMPER: ShotQuality = { kind: "jumper", grade: "perfect", family: "jumper", chance: 0.9, distance: 5, contest: 0, bankable: 0.25 };
const LAYUP: ShotQuality = { kind: "layup", grade: "good", family: "layup", chance: 0.8, distance: 0.8, contest: 0.2, bankable: 0.25 };

/** How often each ending comes up over many picks of the same shot. */
function share(q: ShotQuality, seed = 1): Record<ShotPreset, number> & { made: number } {
  const rng = seeded(seed);
  const count = Object.fromEntries(PRESETS.map((p) => [p, 0])) as Record<ShotPreset, number>;
  let made = 0;
  for (let i = 0; i < N; i++) {
    const p = pickPreset(rng, q).preset;
    count[p]++;
    if (isMakePreset(p)) made++;
  }
  const out = { made: made / N } as Record<ShotPreset, number> & { made: number };
  for (const p of PRESETS) out[p] = count[p] / N;
  return out;
}

const makes = (s: Record<ShotPreset, number> & { made: number }, p: ShotPreset) => s[p] / s.made;
const misses = (s: Record<ShotPreset, number> & { made: number }, p: ShotPreset) => s[p] / (1 - s.made);

describe("the shot outcome picker", () => {
  it("makes a shot exactly as often as the shot model says", () => {
    for (const chance of [0.2, 0.5, 0.75, 0.95]) {
      expect(Math.abs(share({ ...JUMPER, chance }).made - chance)).toBeLessThan(0.012);
    }
  });

  it("always swishes gold, even with a hand in the face from deep", () => {
    const s = share({ ...JUMPER, grade: "gold", chance: 1, contest: 1, distance: 8.5 });
    expect(s.swish).toBe(1);
  });

  it("swishes most clean green jumpers that go in", () => {
    expect(makes(share(JUMPER), "swish")).toBeGreaterThan(0.6);
    // A poor release that still drops finds the iron more often.
    const poor = share({ ...JUMPER, grade: "early", chance: 0.25 });
    expect(makes(poor, "swish")).toBeLessThan(makes(share(JUMPER), "swish"));
    expect(makes(poor, "frontRimIn")).toBeGreaterThan(makes(poor, "backRimIn"));
  });

  it("rolls close layups round the ring far more than jumpers", () => {
    const layup = share(LAYUP);
    const jumper = share({ ...JUMPER, chance: 0.5 });
    expect(makes(layup, "rollIn")).toBeGreaterThan(makes(jumper, "rollIn") * 3);
    expect(misses(layup, "rollOut")).toBeGreaterThan(misses(jumper, "rollOut") * 3);
  });

  it("sends a late miss long off the back iron and never a layup", () => {
    const late = share({ ...JUMPER, grade: "late", chance: 0.2, distance: 7.5 });
    const early = share({ ...JUMPER, grade: "early", chance: 0.2, distance: 7.5 });
    expect(misses(late, "backIron")).toBeGreaterThan(misses(early, "backIron") * 2);
    expect(share({ ...LAYUP, chance: 0.4 }).backIron).toBe(0);
  });

  it("keeps airballs rare on open shots and likelier on a contested heave", () => {
    const open = share({ ...JUMPER, chance: 0.5 });
    const heave = share({ ...JUMPER, grade: "late", chance: 0.1, distance: 8.5, contest: 1 });
    expect(open.airball).toBeLessThan(0.01);
    expect(misses(heave, "airball")).toBeGreaterThan(misses(open, "airball") * 4);
  });

  it("uses the glass on a bank shot and from the wings", () => {
    expect(makes(share({ ...LAYUP, family: "bank", bankable: 1 }), "bank")).toBeGreaterThan(0.7);
    const wing = share({ ...JUMPER, chance: 0.6, distance: 4.5, bankable: 1 });
    const top = share({ ...JUMPER, chance: 0.6, distance: 4.5, bankable: 0 });
    expect(wing.bank).toBeGreaterThan(0);
    expect(top.bank).toBe(0);
  });

  it("can give every ending across ordinary shots", () => {
    const seen = new Set<ShotPreset>();
    const shots: ShotQuality[] = [JUMPER, { ...JUMPER, chance: 0.3, grade: "late", distance: 8, contest: 0.9 }, LAYUP, { ...LAYUP, family: "bank", bankable: 1, chance: 0.5 }];
    shots.forEach((q, i) => PRESETS.forEach((p) => share(q, i + 1)[p] > 0 && seen.add(p)));
    expect([...seen].sort()).toEqual([...PRESETS].sort());
  });
});
