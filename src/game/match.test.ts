import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { EN_GARDE_SECONDS, HALT_MS, SHORT_HALT_MS } from "./rules";

describe("Match", () => {
  it("counts down, goes live, halts and returns to en garde", () => {
    const match = new Match();
    match.start(0);
    expect(match.countdown(0)).toBe(EN_GARDE_SECONDS);
    expect(match.update(EN_GARDE_SECONDS * 1000)).toBe("live");
    match.halt({ kind: "touch", scorer: 2 }, 5000);
    expect(match.scores[2]).toBe(1);
    expect(match.update(5000 + HALT_MS - 1)).toBeNull();
    expect(match.update(5000 + HALT_MS)).toBe("enGarde");
  });

  it("restarts quickly after a double or corps-à-corps, with no score", () => {
    const match = new Match();
    match.start(0);
    match.halt({ kind: "double" }, 0);
    expect(match.update(SHORT_HALT_MS)).toBe("enGarde");
    expect(match.scores).toEqual({ 1: 0, 2: 0 });
  });

  it("ends the match at two touches and restarts on a double rematch vote", () => {
    const match = new Match();
    match.start(0);
    match.halt({ kind: "touch", scorer: 1 }, 0);
    expect(match.isMatchPoint(1)).toBe(true);
    match.halt({ kind: "touch", scorer: 1 }, 10);
    expect(match.winner).toBe(1);
    expect(match.update(10 + HALT_MS)).toBe("matchOver");
    expect(match.voteRematch(1)).toBe(false);
    expect(match.voteRematch(2)).toBe(true);
    match.start(99_999);
    expect(match.scores).toEqual({ 1: 0, 2: 0 });
  });

  it("pauses an exchange and restarts it from the countdown", () => {
    const match = new Match();
    match.start(0);
    match.update(EN_GARDE_SECONDS * 1000);
    match.pause(4000);
    expect(match.phase).toBe("paused");
    match.resume(9000);
    expect(match.phase).toBe("enGarde");
  });
});
