import { describe, expect, it } from "vitest";
import { Match, type Entry } from "../engine/match";
import type { Action } from "../engine/types";
import { BUILD_IDS } from "../builds";
import { BannerGate, ballAtHoop, MAX_WAIT, SETTLE } from "./banner-gate";
import type { BannerText } from "./callouts";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
const WIN: BannerText = { text: "SKY WIN!", sub: "11 to 9", tone: "team0" };
const BLOCK: BannerText = { text: "BLOCKED!", sub: "P1", tone: "white" };

/** A live match with the ball in a hand and nobody finishing. */
function quiet(): Match {
  const m = new Match({ entries: ENTRIES, seed: 1, firstOffence: 0 });
  m.phase = "live";
  for (const a of m.athletes) a.action = { kind: "none" };
  m.ball.mode = "held";
  m.ball.holder = 0;
  m.ball.shot = null;
  return m;
}

/** The ball up on a shot that has not counted yet. */
function shotUp(m: Match): void {
  m.ball.mode = "flight";
  m.ball.flightKind = "shot";
  m.ball.holder = null;
  m.ball.shot = { counted: false } as Match["ball"]["shot"];
}

describe("the banner gate", () => {
  it("sees the ball at the hoop on a shot in the air and on a finish going up", () => {
    const m = quiet();
    expect(ballAtHoop(m)).toBe(false);
    shotUp(m);
    expect(ballAtHoop(m)).toBe(true);
    m.ball.shot!.counted = true;
    expect(ballAtHoop(m)).toBe(false);
    const n = quiet();
    n.athletes[0]!.action = { kind: "drive" } as Action;
    expect(ballAtHoop(n)).toBe(true);
  });

  it("shows a banner at once when the ball is nowhere near the hoop", () => {
    const m = quiet();
    expect(new BannerGate().offer(BLOCK, m)).toBe(BLOCK);
  });

  it("holds the win until the ball has dropped through the net", () => {
    const m = quiet();
    const gate = new BannerGate();
    m.time = 30;
    gate.basket(m.time);
    expect(gate.offer(WIN, m)).toBeNull();
    m.time += SETTLE / 2;
    expect(gate.release(m)).toBeNull();
    m.time += SETTLE;
    expect(gate.release(m)).toBe(WIN);
    expect(gate.release(m)).toBeNull();
  });

  it("holds a call made while a shot is in the air until it is down", () => {
    const m = quiet();
    const gate = new BannerGate();
    shotUp(m);
    expect(gate.offer(BLOCK, m)).toBeNull();
    m.time += 0.3;
    expect(gate.release(m)).toBeNull();
    m.ball.mode = "loose";
    expect(gate.release(m)).toBe(BLOCK);
  });

  it("never holds one past the longest wait, and drops it when the replay takes over", () => {
    const m = quiet();
    const gate = new BannerGate();
    shotUp(m);
    gate.offer(BLOCK, m);
    m.time += MAX_WAIT;
    expect(gate.release(m)).toBe(BLOCK);
    gate.offer(WIN, m);
    gate.drop();
    m.ball.mode = "loose";
    expect(gate.release(m)).toBeNull();
  });

  it("treats a clock behind the last basket as a new game", () => {
    const m = quiet();
    const gate = new BannerGate();
    gate.basket(40);
    m.time = 1;
    expect(gate.offer(BLOCK, m)).toBe(BLOCK);
  });
});
