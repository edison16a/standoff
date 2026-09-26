import { describe, expect, it } from "vitest";
import { celebrateGoal } from "./celebrate";
import { createMatch, type Entrant } from "./match";
import { STEP } from "./tuning";
import type { MatchState } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: null },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "ashworth", seat: null },
];

/** A goal by `scorer`, with the team mates starting from wherever `start` puts them, celebrated for three seconds. */
function celebrate(scorer: number, start: (i: number) => { x: number; z: number }): MatchState {
  const state = createMatch(LINEUP, { seed: 3, replays: false });
  state.athletes.forEach((a, i) => (a.pos = start(i)));
  state.phase = "goal";
  state.phaseT = 0;
  state.lastGoal = { team: state.athletes[scorer]!.team, scorer };
  for (let t = 0; t < 3; t += STEP) {
    state.phaseT += STEP;
    celebrateGoal(state, STEP);
  }
  return state;
}

describe("a goal celebration", () => {
  const starts = [
    (i: number) => ({ x: 8 + i * 0.1, z: 2 }),
    (i: number) => ({ x: 14 - i * 3, z: -6 + i * 2 }),
    (i: number) => ({ x: 17, z: 11 - i * 0.05 }),
  ];

  it("keeps the team mates beside the scorer, never inside one another", () => {
    for (const start of starts) {
      const state = celebrate(0, start);
      const side = state.athletes.filter((a) => a.team === 0);
      for (let i = 0; i < side.length; i++) {
        for (let j = i + 1; j < side.length; j++) {
          expect(Math.hypot(side[i]!.pos.x - side[j]!.pos.x, side[i]!.pos.z - side[j]!.pos.z)).toBeGreaterThan(1.2);
        }
      }
    }
  });

  it("puts the team mates behind the scorer, away from the cameras on the near side", () => {
    for (const start of starts) {
      const state = celebrate(1, start);
      const scorer = state.athletes[1]!;
      for (const mate of state.athletes.filter((a) => a.team === 0 && a !== scorer)) {
        expect(mate.pos.z).toBeLessThan(scorer.pos.z - 0.5);
        expect(mate.action).toBe("celebrate");
      }
    }
  });
});
