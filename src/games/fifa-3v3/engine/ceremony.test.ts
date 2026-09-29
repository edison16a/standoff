import { describe, expect, it } from "vitest";
import { adminWin } from "./admin";
import { CEREMONY, CEREMONY_FACING, CEREMONY_SPOT, captainOf, ceremonyTime } from "./ceremony";
import { createMatch, stepMatch, type Entrant } from "./match";
import { fullTime } from "./rules";
import { STEP } from "./tuning";
import type { MatchState } from "./types";
import { buildView } from "./view";

const LINEUP: Entrant[] = [
  { team: 0, build: "striker", seat: null },
  { team: 0, build: "playmaker", seat: 2 },
  { team: 0, build: "winger", seat: null },
  { team: 1, build: "defender", seat: 1 },
  { team: 1, build: "keeper", seat: null },
  { team: 1, build: "allrounder", seat: null },
];

/** Red wins, with the goals given out by `goals`, then the match runs `seconds` past the whistle. */
function wonBy(goals: number[], seconds: number): MatchState {
  const state = createMatch(LINEUP, { seed: 4, replays: false });
  goals.forEach((g, i) => (state.athletes[i]!.stats.goals = g));
  state.score = [3, 1];
  fullTime(state);
  for (let t = 0; t < seconds; t += STEP) stepMatch(state);
  return state;
}

const gap = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe("the trophy ceremony", () => {
  it("gives the cup to the winners' top scorer, and to a phone's player on a tie", () => {
    const state = createMatch(LINEUP, { seed: 1 });
    state.athletes[2]!.stats.goals = 2;
    expect(captainOf(state, 0)!.id).toBe(2);
    state.athletes[1]!.stats.goals = 2;
    expect(captainOf(state, 0)!.id).toBe(1);
  });

  it("waits for the cut before it starts", () => {
    const state = wonBy([1, 0, 2], CEREMONY.cut - 0.3);
    expect(ceremonyTime(state)).toBeNull();
    expect(state.ceremony).toBeNull();
    expect(buildView(state).ceremony).toBeNull();
  });

  it("puts the captain on the centre spot facing the cameras, with the side around him", () => {
    const state = wonBy([1, 0, 2], CEREMONY.cut + 0.5);
    const captain = state.athletes[2]!;
    expect(state.ceremony?.captain).toBe(2);
    expect(gap(captain.pos, CEREMONY_SPOT)).toBeLessThan(0.2);
    expect(captain.facing).toBeCloseTo(CEREMONY_FACING);
    for (const mate of state.athletes.filter((a) => a.team === 0 && a !== captain)) {
      expect(gap(mate.pos, captain.pos)).toBeLessThan(2);
      expect(mate.pos.z).toBeLessThan(captain.pos.z);
    }
    // The winners' keeper joins in; the losers are well back out of the picture's middle.
    expect(gap(state.keepers[0].pos, captain.pos)).toBeLessThan(2);
    expect(state.keepers[0].action).toBe("cheer");
    for (const loser of state.athletes.filter((a) => a.team === 1)) expect(gap(loser.pos, captain.pos)).toBeGreaterThan(7);
  });

  it("crowds the side in once the cup is up, never inside one another", () => {
    const before = wonBy([1, 0, 2], CEREMONY.cut + CEREMONY.raise);
    const after = wonBy([1, 0, 2], CEREMONY.cut + CEREMONY.up + 2);
    const spread = (s: MatchState) => s.athletes.filter((a) => a.team === 0 && a.id !== 2).map((a) => gap(a.pos, s.athletes[2]!.pos));
    const was = spread(before);
    spread(after).forEach((d, i) => expect(d).toBeLessThan(was[i]! - 0.2));
    const side = after.athletes.filter((a) => a.team === 0);
    for (let i = 0; i < side.length; i++) for (let j = i + 1; j < side.length; j++) expect(gap(side[i]!.pos, side[j]!.pos)).toBeGreaterThan(0.6);
  });

  it("tells the drawing who is who", () => {
    const view = buildView(wonBy([0, 1, 0], CEREMONY.cut + 1));
    expect(view.ceremony).toMatchObject({ captain: 1, team: 0 });
    expect(view.ceremony!.t).toBeGreaterThan(0.9);
    expect(view.athletes.map((a) => a.ceremony)).toEqual(["mate", "captain", "mate", "beaten", "beaten", "beaten"]);
  });

  it("can be reached from the admin panel, the tester's side a goal up", () => {
    const state = createMatch(LINEUP, { seed: 2 });
    state.score = [0, 2];
    expect(adminWin(state)).toBe(true);
    expect(state.phase).toBe("fulltime");
    expect(state.winner).toBe(0);
    expect(state.score).toEqual([3, 2]);
    expect(adminWin(state)).toBe(false);
  });
});
