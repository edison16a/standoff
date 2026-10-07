import { describe, expect, it } from "vitest";
import { FilmClock, PREROLL } from "./film-clock";
import { CRANE_TO, CUTS, RAMP, cutLength, rateAt, trailerLength, type Cut } from "./trailer-plan";

const FRAME = 1 / 30;
const slowCut: Cut = { film: "highlight", from: 0, to: 2, cam: "rise", slow: { from: 1, to: 1.5, scale: 0.25 } };

describe("the trailer's speed ramps", () => {
  it("runs at full speed outside a slow window and at its scale inside", () => {
    expect(rateAt(slowCut, 0.2)).toBe(1);
    expect(rateAt(slowCut, 1.2)).toBe(0.25);
    expect(rateAt(slowCut, 1.9)).toBe(1);
  });

  it("ramps smoothly in and out rather than jumping", () => {
    const before = rateAt(slowCut, 1 - RAMP / 2);
    const after = rateAt(slowCut, 1.5 + RAMP / 2);
    expect(before).toBeGreaterThan(0.25);
    expect(before).toBeLessThan(1);
    expect(after).toBeCloseTo(before, 5);
  });

  it("makes a slowed cut last longer on screen than its game time", () => {
    expect(cutLength(slowCut, FRAME)).toBeGreaterThan(2.5);
    expect(cutLength({ ...slowCut, slow: undefined }, FRAME)).toBeCloseTo(2, 1);
  });
});

describe("the trailer's cuts", () => {
  it("opens on the same moment of the crane shot it ends on, so the capture's cross fade blends a shot into itself", () => {
    const first = CUTS[0]!;
    const last = CUTS[CUTS.length - 1]!;
    expect(first.cam).toBe("crane");
    expect(last.cam).toBe("crane");
    expect(first.to).toBe(CRANE_TO);
    expect(last.to).toBe(CRANE_TO);
    expect(cutLength(first, FRAME)).toBeCloseTo(1, 1);
  });

  it("keeps every cut short, as a trailer cuts", () => {
    for (const cut of CUTS) expect(cutLength(cut, FRAME)).toBeLessThan(2);
  });

  it("runs about fourteen seconds, so the clip loops in thirteen after the cross fade", () => {
    const length = trailerLength(FRAME);
    expect(length).toBeGreaterThan(12.5);
    expect(length).toBeLessThan(15);
  });
});

describe("the film clock", () => {
  it("films nothing until the capture tool's warm up is over", () => {
    const clock = new FilmClock(1 / 60);
    let now = 0;
    let filmed = 0;
    for (let i = 0; i < 60 * 4; i++) {
      now += 1000 / 60;
      const tick = clock.tick(now, true);
      if (tick.draw) filmed++;
      if (now / 1000 < PREROLL - 0.05) expect(tick.filming).toBe(false);
    }
    // One draw per filmed frame, at thirty a second, for the second or so after the warm up.
    expect(filmed).toBeGreaterThan(25);
    expect(filmed).toBeLessThan(40);
  });

  it("takes a long stall as one filmed frame, so a slow software frame never races the film ahead", () => {
    const clock = new FilmClock(1 / 60);
    clock.tick(0, true);
    expect(clock.tick(20000, true).real).toBeCloseTo(1 / 30, 5);
  });
});
