import { describe, expect, it } from "vitest";
import { footPoint } from "./athlete";
import type { MatchEvent } from "./events";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startSlide } from "./slide";
import { MATCH, STEP } from "./tuning";

const LINEUP: Entrant[] = [
  { team: 0, build: "defender", seat: 1 },
  { team: 1, build: "playmaker", seat: null },
];

/** Our defender slides at Blue's dribbler from `from`, the dribbler running along +x. Returns what came of it. */
function slideAt(seed: number, from: { x: number; z: number }) {
  const state = createMatch(LINEUP, { seed, replays: false, level: "training" });
  for (let t = 0; t <= MATCH.kickoffWait + STEP; t += STEP) stepMatch(state);
  const me = state.athletes[0]!;
  const him = state.athletes[1]!;
  him.pos = { x: 0, z: 0 };
  him.facing = 0;
  him.vel = { x: 3, z: 0 };
  state.ball.owner = { kind: "athlete", id: 1 };
  state.ball.pos = { ...footPoint(him), y: 0.11 };
  state.ball.vel = { x: 3, y: 0, z: 0 };
  state.ball.heldFor = 2;
  me.pos = { ...from };
  const toBall = { x: state.ball.pos.x + 0.6 - me.pos.x, z: state.ball.pos.z - me.pos.z };
  startSlide(state, me, toBall);
  const events: MatchEvent[] = [];
  for (let t = 0; t < 1 && state.phase === "play"; t += STEP) {
    stepMatch(state);
    events.push(...state.events);
  }
  return {
    foul: events.some((e) => e.type === "foul"),
    won: events.some((e) => e.type === "tackle" && e.athlete === 0 && e.won),
    hopped: events.some((e) => e.type === "tackle" && e.athlete === 0 && !e.won),
    ballMoved: Math.hypot(state.ball.vel.x, state.ball.vel.z),
  };
}

describe("the slide tackle", () => {
  it("from the side, gets to the ball first and knocks it away cleanly, unless he hops it", () => {
    let clean = 0;
    let hops = 0;
    let fouls = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = slideAt(seed, { x: 1.4, z: 2.2 });
      if (r.won && !r.foul) clean++;
      if (r.hopped) hops++;
      if (r.foul) fouls++;
    }
    expect(clean).toBeGreaterThan(6);
    expect(hops).toBeGreaterThan(0);
    expect(fouls).toBeLessThan(5);
  });

  it("through the back of him takes the man first, and is nearly always a foul", () => {
    let fouls = 0;
    for (let seed = 1; seed <= 20; seed++) if (slideAt(seed, { x: -2.2, z: 0 }).foul) fouls++;
    expect(fouls).toBeGreaterThan(9);
  });
});
