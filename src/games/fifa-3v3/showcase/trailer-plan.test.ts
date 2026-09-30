import { describe, expect, it } from "vitest";
import { STRIKER, makeFilm, stepFilm } from "./trailer-films";
import { CRANE_TO, CUTS, RAMP, cutLength, rateAt, trailerLength, type Cut } from "./trailer-plan";

const FRAME = 1 / 30;
const slowCut: Cut = { film: "match", from: 0, to: 2, cam: "sui", slow: { from: 1, to: 1.5, scale: 0.25 } };

/** Plays one cut's film from its start to its end and lists what happened in the cut. */
function eventsIn(cut: Cut): string[] {
  const state = makeFilm(cut.film);
  const t0 = state.time;
  while (state.time - t0 < cut.from - 1e-9) stepFilm(state);
  const seen: string[] = [];
  while (state.time - t0 < cut.to) for (const e of stepFilm(state)) seen.push(e.type === "tackle" ? `tackle${e.won ? "Won" : "Lost"}${e.victim}` : e.type);
  return seen;
}

describe("the trailer's speed ramps", () => {
  it("runs at full speed outside a slow window and at its scale inside, ramping between", () => {
    expect(rateAt(slowCut, 0.2)).toBe(1);
    expect(rateAt(slowCut, 1.2)).toBe(0.25);
    const ramp = rateAt(slowCut, 1 - RAMP / 2);
    expect(ramp).toBeGreaterThan(0.25);
    expect(ramp).toBeLessThan(1);
  });

  it("makes a slowed cut last longer on screen than its game time", () => {
    expect(cutLength(slowCut, FRAME)).toBeGreaterThan(2.5);
  });
});

describe("the trailer's cuts", () => {
  it("opens on the crane shot's last second, the same moment it ends on, so the loop's cross fade is seamless", () => {
    const first = CUTS[0]!;
    const last = CUTS[CUTS.length - 1]!;
    expect([first.cam, last.cam]).toEqual(["crane", "crane"]);
    expect(first.to).toBe(CRANE_TO);
    expect(last.to).toBe(CRANE_TO);
    expect(cutLength(first, FRAME)).toBeCloseTo(1, 1);
  });

  it("runs about ten seconds", () => {
    const length = trailerLength(FRAME);
    expect(length).toBeGreaterThan(9);
    expect(length).toBeLessThan(11.5);
  });

  it("films the seeded match's moments where the plan says they are", () => {
    const at = (cam: Cut["cam"]) => eventsIn(CUTS.find((c) => c.cam === cam)!);
    expect(at("hurdle")).toContain(`tackleLost${STRIKER}`);
    expect(at("strike")).toContain("shot");
    expect(at("net")).toContain("goal");
  });

  it("crowns the Striker in the ceremony film", () => {
    const state = makeFilm("ceremony");
    stepFilm(state);
    expect(state.ceremony?.captain).toBe(STRIKER);
  });
});
