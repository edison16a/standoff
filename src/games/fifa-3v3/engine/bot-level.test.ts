import { describe, expect, it } from "vitest";
import { createMatch, stepMatch, type Entrant } from "./match";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: null },
  { team: 0, character: "brandao", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
];

function run(level: "easy" | "hard" | "training", seconds: number) {
  const state = createMatch(LINEUP, { seed: 4, botLevel: level });
  const start = state.athletes.map((a) => ({ ...a.pos }));
  for (let i = 0; i < seconds * 60; i++) stepMatch(state);
  const moved = state.athletes.map((a, i) => Math.hypot(a.pos.x - start[i]!.x, a.pos.z - start[i]!.z));
  return { state, moved };
}

describe("computer difficulty", () => {
  it("leaves the computer players standing still in Training", () => {
    const { moved } = run("training", 6);
    for (const d of moved) expect(d).toBeLessThan(0.01);
  });

  it("lets Easy computers run slower than Hard ones", () => {
    const easy = run("easy", 4).moved.reduce((a, b) => a + b, 0);
    const hard = run("hard", 4).moved.reduce((a, b) => a + b, 0);
    expect(easy).toBeGreaterThan(1);
    expect(hard).toBeGreaterThan(easy * 0.8);
  });
});
