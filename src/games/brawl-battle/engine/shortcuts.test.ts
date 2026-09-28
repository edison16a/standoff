import { describe, expect, it } from "vitest";
import { createMatch, stepMatch } from "./match";
import { fillPlayerUlts, skipToResults } from "./shortcuts";

function match() {
  const state = createMatch(
    [
      { character: "karate", seat: null },
      { character: "samurai", seat: 2 },
      { character: "bear", seat: null },
    ],
    { stage: "dojo-rooftop", seed: 3, difficulty: "training" },
  );
  state.phase = "fight";
  return state;
}

describe("admin shortcuts", () => {
  it("skips to results with the first player as the winner", () => {
    const state = match();
    skipToResults(state);
    stepMatch(state);
    expect(state.phase).toBe("game");
    expect(state.winner).toBe(1);
  });

  it("works from the countdown too", () => {
    const state = match();
    state.phase = "ready";
    skipToResults(state);
    stepMatch(state);
    expect(state.phase).toBe("game");
  });

  it("does nothing once the match is decided", () => {
    const state = match();
    state.phase = "game";
    skipToResults(state);
    expect(state.fighters.every((f) => f.stocks > 0)).toBe(true);
  });

  it("fills only the players' ults", () => {
    const state = match();
    fillPlayerUlts(state);
    expect(state.fighters.map((f) => f.ult)).toEqual([0, 1, 0]);
  });
});
