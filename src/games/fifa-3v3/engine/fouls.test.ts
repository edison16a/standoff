import { describe, expect, it } from "vitest";
import { WALL } from "./defence-tuning";
import { forceFoul, kindAt } from "./fouls";
import { goalX } from "./goal";
import { createMatch, stepMatch, type Entrant } from "./match";
import { startPlay } from "./rules";
import { startSlide } from "./tackle";
import { KEEPER, PITCH } from "./tuning";
import type { MatchEvent } from "./events";
import type { MatchState } from "./types";
import { dist } from "./vec";

const LINEUP: Entrant[] = [
  { team: 0, character: "echeverri", seat: 1 },
  { team: 0, character: "brandao", seat: null },
  { team: 0, character: "okemba", seat: null },
  { team: 1, character: "holmvik", seat: null },
  { team: 1, character: "lacerda", seat: null },
  { team: 1, character: "serrano", seat: null },
];

function live(seed = 3): MatchState {
  const state = createMatch(LINEUP, { seed, replays: false });
  startPlay(state);
  return state;
}

/** Runs the match, gathering events, until `until` holds or time runs out. */
function runUntil(state: MatchState, until: (s: MatchState) => boolean, seconds = 10): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let i = 0; i < seconds * 60 && !until(state); i++) {
    stepMatch(state);
    events.push(...state.events);
  }
  return events;
}

describe("fouls", () => {
  it("gives a penalty inside the box and a free kick outside it", () => {
    expect(kindAt({ x: goalX(1) - 3, z: 1 }, 1)).toBe("penalty");
    expect(kindAt({ x: goalX(1) - PITCH.boxRadius - 2, z: 1 }, 1)).toBe("free");
  });

  it("blows for most slides through the back of the man", () => {
    let fouls = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const state = live(seed);
      const carrier = state.athletes[0]!;
      const tackler = state.athletes[3]!;
      carrier.pos = { x: 0, z: 0 };
      carrier.facing = 0;
      state.ball.owner = { kind: "athlete", id: 0 };
      tackler.pos = { x: -1.6, z: 0 };
      tackler.brain.thinkIn = 99;
      startSlide(state, tackler, { x: 1, z: 0 });
      runUntil(state, (s) => s.phase === "foul", 1);
      if (state.phase === "foul") fouls++;
    }
    expect(fouls).toBeGreaterThanOrEqual(8);
  });

  it("sends the referee in to show the card, then lines up a free kick with a three man wall", () => {
    const state = live();
    expect(forceFoul(state, 0, "free")).toBe(true);
    expect(state.phase).toBe("foul");
    const events = runUntil(state, (s) => s.phase === "setpiece");
    expect(events.some((e) => e.type === "card")).toBe(true);
    const sp = state.setPiece!;
    expect(sp.kind).toBe("free");
    expect(sp.taker).toBe(0);
    expect(sp.wall).toHaveLength(WALL.size);
    for (const id of sp.wall) {
      const a = state.athletes[id]!;
      expect(a.action).toBe("wall");
      expect(dist(a.pos, sp.spot)).toBeGreaterThan(WALL.distance - 0.8);
      expect(dist(a.pos, sp.spot)).toBeLessThan(WALL.distance + 0.8);
    }
    expect(sp.path.length).toBeGreaterThan(3);
  });

  it("puts the keeper on the line and the ball on the spot for a penalty", () => {
    const state = live();
    forceFoul(state, 0, "penalty");
    runUntil(state, (s) => s.phase === "setpiece");
    const sp = state.setPiece!;
    expect(sp.kind).toBe("penalty");
    expect(Math.abs(sp.spot.x - goalX(1))).toBeCloseTo(PITCH.penaltySpot);
    const k = state.keepers[1];
    expect(Math.abs(k.pos.x - goalX(1))).toBeCloseTo(KEEPER.lineGap);
    for (const a of state.athletes) if (a.id !== sp.taker) expect(dist(a.pos, { x: goalX(1), z: 0 })).toBeGreaterThan(PITCH.boxRadius);
  });
});
