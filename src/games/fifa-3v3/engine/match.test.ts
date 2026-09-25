import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { PITCH, STEP } from "./tuning";
import type { Command, MatchState } from "./types";

const LINEUP: Entrant[] = [
  { team: 0, character: "messi", seat: null },
  { team: 0, character: "ronaldo", seat: null },
  { team: 0, character: "mbappe", seat: null },
  { team: 1, character: "haaland", seat: null },
  { team: 1, character: "vinicius", seat: null },
  { team: 1, character: "bellingham", seat: null },
];

/** Plays a match of computer players to the final whistle, or gives up after ten minutes. */
function playOut(seed: number): { state: MatchState; events: MatchEvent[] } {
  const state = createMatch(LINEUP, { seed, replays: false });
  const events: MatchEvent[] = [];
  for (let t = 0; t < 600 && state.phase !== "fulltime"; t += STEP) {
    stepMatch(state);
    events.push(...state.events);
    for (const a of state.athletes) if (!Number.isFinite(a.pos.x + a.pos.z)) throw new Error("A player left the world.");
    if (!Number.isFinite(state.ball.pos.x + state.ball.pos.y + state.ball.pos.z)) throw new Error("The ball left the world.");
  }
  return { state, events };
}

describe("a match of computer players", () => {
  const matches = [1, 2, 3, 4].map(playOut);
  const all = matches.flatMap((m) => m.events);
  const count = (type: MatchEvent["type"]) => all.filter((e) => e.type === type).length;

  it("reaches the final whistle with a winner", () => {
    for (const { state } of matches) {
      expect(state.phase).toBe("fulltime");
      expect(state.winner).not.toBeNull();
      expect(state.score[state.winner!]).toBeGreaterThan(state.score[state.winner === 0 ? 1 : 0]);
    }
  });

  it("has goals, shots, saves, passes and tackles", () => {
    expect(count("goal")).toBeGreaterThan(4);
    expect(count("shot")).toBeGreaterThan(count("goal"));
    expect(count("save")).toBeGreaterThan(0);
    expect(count("pass")).toBeGreaterThan(20);
    expect(count("tackle")).toBeGreaterThan(5);
  });

  it("sees shots of every kind", () => {
    const outcomes = new Set(all.flatMap((e) => (e.type === "shot" ? [e.outcome] : [])));
    for (const outcome of ["goal", "catch", "parry", "over"]) expect(outcomes).toContain(outcome);
  });

  it("plays the same match from the same seed", () => {
    const again = playOut(1);
    expect(again.state.score).toEqual(matches[0]!.state.score);
    expect(again.state.time).toBeCloseTo(matches[0]!.state.time, 6);
  });
});

describe("a phone's player", () => {
  it("cannot walk the ball into the net without shooting", () => {
    for (let seed = 1; seed <= 6; seed++) {
      const state = createMatch([{ team: 0, character: "messi", seat: 1 }, ...LINEUP.slice(3)], { seed, replays: false });
      state.kickoffTeam = 0;
      for (let t = 0; t < 15; t += STEP) {
        const me = state.athletes[0]!;
        const to = { x: PITCH.halfLength + 1 - me.pos.x, z: -me.pos.z };
        const d = Math.hypot(to.x, to.z);
        stepMatch(state, new Map([[0, { move: { x: to.x / d, z: to.z / d } }]]));
        expect(state.events.some((e) => e.type === "goal" && e.scorer === 0)).toBe(false);
      }
    }
  });

  it("dribbles, shoots and scores past an empty goal line", () => {
    const state = createMatch([{ team: 0, character: "messi", seat: 1 }, ...LINEUP.slice(3)], { seed: 5, replays: false });
    state.kickoffTeam = 0;
    const commands = new Map<number, Command>();
    let shot = false;
    let heldSince: number | null = null;
    for (let t = 0; t < 20 && !shot; t += STEP) {
      const me = state.athletes[0]!;
      const toGoal = { x: PITCH.halfLength - me.pos.x, z: -me.pos.z };
      const d = Math.hypot(toGoal.x, toGoal.z);
      const mine = state.ball.owner?.kind === "athlete" && state.ball.owner.id === 0;
      // Shoot/Pass is held into the yellow, then let go.
      const down = mine && d < 10 && heldSince === null;
      if (down) heldSince = t;
      const up = heldSince !== null && t - heldSince > 0.7;
      commands.set(0, { move: { x: toGoal.x / d, z: toGoal.z / d }, shootDown: down, shootUp: up });
      stepMatch(state, commands);
      shot ||= state.events.some((e) => e.type === "shot" && e.power > 0.4 && e.power < 0.8);
    }
    expect(shot).toBe(true);
  });

  it("wins the ball back with a slide tackle sometimes", () => {
    let won = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const state = createMatch([{ team: 0, character: "haaland", seat: 1 }, ...LINEUP.slice(3)], { seed, replays: false });
      state.kickoffTeam = 1;
      for (let t = 0; t < 12; t += STEP) {
        const me = state.athletes[0]!;
        const ball = state.ball.pos;
        const to = { x: ball.x - me.pos.x, z: ball.z - me.pos.z };
        const d = Math.hypot(to.x, to.z) || 1;
        const theirs = state.ball.owner?.kind === "athlete" && state.ball.owner.id !== 0;
        stepMatch(state, new Map([[0, { move: { x: to.x / d, z: to.z / d }, slide: theirs && d < 2.2 }]]));
        if (state.events.some((e) => e.type === "tackle" && e.athlete === 0 && e.won)) {
          won++;
          break;
        }
      }
    }
    expect(won).toBeGreaterThan(2);
  });
});
