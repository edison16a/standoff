import { describe, expect, it } from "vitest";
import { Blade } from "../engine/blade";
import type { Body } from "../engine/events";
import { Match } from "../engine/match";
import { DEFAULT_SETTINGS } from "../engine/settings";
import { COUNTDOWN_S } from "../engine/tuning";
import { phoneStateSchema } from "../protocol";
import { phoneState, rankOf } from "./phone-link";
import { buzzFor, roundHud } from "./round-view";
import { SeatBook } from "./seat-book";

const name = (seat: number) => `P${seat}`;
const body = (kind: Body["kind"]): Body => ({ id: 1, kind, x: 0, y: 0, vx: 0, vy: 0, radius: 1, hitsLeft: 0, hits: 1, cooldown: 0, touching: [], spin: { x: 0, y: 0, z: 0 } });

function playing(seats: number[]): Match {
  const match = new Match(DEFAULT_SETTINGS, seats, 1, 9);
  for (let t = 0; t <= COUNTDOWN_S + 0.1; t += 0.05) match.step(0.05, new Map<number, Blade>());
  return match;
}

describe("the seat book", () => {
  it("only counts ready phones that are still here", () => {
    const book = new SeatBook();
    book.setReady(2, true);
    book.setReady(1, true);
    book.setReady(3, false);
    expect(book.readyAmong([1, 2, 3])).toEqual([1, 2]);
    expect(book.readyAmong([2, 3])).toEqual([2]);
  });

  it("forgets ready when a phone goes back a step or leaves, but keeps its blade", () => {
    const book = new SeatBook();
    book.setBlade(1, "fire");
    book.setReady(1, true);
    book.setStep(1, "blade");
    expect(book.get(1).ready).toBe(false);
    book.setReady(1, true);
    book.leave(1);
    expect(book.get(1)).toMatchObject({ ready: false, blade: "fire" });
  });
});

describe("what the screens are told", () => {
  it("shows the lobby when there is no round", () => {
    expect(roundHud(null, name).phase).toBe("lobby");
  });

  it("ranks players with ties sharing a place, and greys out who left", () => {
    const match = playing([1, 2, 3]);
    match.scores.set(1, 20);
    match.scores.set(2, 50);
    match.scores.set(3, 20);
    match.setActive(3, false);
    const hud = roundHud(match, name);
    expect(hud.standings.map((row) => row.seat)).toEqual([2, 1, 3]);
    expect(hud.standings[2]!.active).toBe(false);
    expect(rankOf(1, hud)).toBe(2);
    expect(rankOf(3, hud)).toBe(2);
  });

  it("sends each phone a valid state, and a late joiner is not in the round", () => {
    const match = playing([1]);
    const hud = roundHud(match, name);
    const mine = phoneState(1, hud, match);
    const late = phoneState(2, hud, match);
    expect(phoneStateSchema.safeParse(mine).success).toBe(true);
    expect(mine).toMatchObject({ inRound: true, phase: "playing" });
    expect(late).toMatchObject({ inRound: false, score: 0 });
  });

  it("buzzes the cutter, with a special buzz for rare fruit and combos", () => {
    expect(buzzFor({ type: "slice", seat: 2, body: body("apple"), dir: { x: 1, y: 0 }, at: { x: 0, y: 0 } })).toEqual({ seat: 2, buzz: "slice" });
    expect(buzzFor({ type: "slice", seat: 1, body: body("dragonfruit"), dir: { x: 1, y: 0 }, at: { x: 0, y: 0 } })).toEqual({ seat: 1, buzz: "rare" });
    expect(buzzFor({ type: "bomb", seat: 3, body: body("bomb"), at: { x: 0, y: 0 } })).toEqual({ seat: 3, buzz: "bomb" });
    expect(buzzFor({ type: "score", seat: 1, delta: 30, total: 30, reason: "combo", at: { x: 0, y: 0 }, count: 3 })).toEqual({ seat: 1, buzz: "combo" });
    expect(buzzFor({ type: "gone", id: 4 })).toBeNull();
  });
});
