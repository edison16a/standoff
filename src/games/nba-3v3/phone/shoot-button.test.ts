import { describe, expect, it } from "vitest";
import type { CourtState } from "../protocol";
import { shootEnabled } from "./shoot-button";

function court(freeThrow: CourtState["freeThrow"]): CourtState {
  return {
    team: 0, score: [0, 0], shotClock: 12, hasBall: true, attacking: true, holder: "Me", mustClear: false, canSteal: false, stealReach: false,
    defending: false, guard: "off", freeThrow, meter: { fullMs: 820, greenMs: 656, halfMs: 60, goldMs: 12 }, onFire: false, checking: false, countdown: null,
  };
}

describe("the Shoot button", () => {
  it("is always awake in open play", () => {
    expect(shootEnabled(court(null), false)).toBe(true);
  });

  it("wakes at the line once the shooter is set", () => {
    expect(shootEnabled(court({ mine: true, n: 1, of: 2, ready: false }), false)).toBe(false);
    expect(shootEnabled(court({ mine: true, n: 1, of: 2, ready: true }), false)).toBe(true);
  });

  it("stays awake through the whole hold after the host has started the shot", () => {
    // The press moves the host on from set to shooting, so ready drops while the thumb is still down.
    expect(shootEnabled(court({ mine: true, n: 1, of: 2, ready: false }), true)).toBe(true);
  });

  it("stays asleep for a teammate's free throw", () => {
    expect(shootEnabled(court({ mine: false, n: 1, of: 2, ready: false }), true)).toBe(false);
  });
});
