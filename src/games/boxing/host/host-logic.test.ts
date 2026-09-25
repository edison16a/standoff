import { describe, expect, it } from "vitest";
import type { MoveEvent, MoveState } from "@/games/kit/camera";
import type { MatchResult } from "../engine/events";
import { ofType } from "../engine/test-helpers";
import { REPLAY_LENGTH, replayClock } from "../render/replay";
import { Banners } from "./banners";
import { FightDriver } from "./fight-driver";
import { LOCK_MS, PickControl } from "./pick-control";
import { addFight, EMPTY_RECORDS, parseRecords } from "./records";

const lean = (slot: number, side: -1 | 1, time: number) => ({ type: "lean", side, slot, time }) as MoveEvent;
const guard = (up: boolean) => ({ guard: up }) as MoveState;

describe("choosing boxers", () => {
  it("browses with a lean and locks in with a held guard", () => {
    const pick = new PickControl([0, 1], [true, false]);
    expect(pick.onMove(lean(1, 1, 0))).toBe(true);
    // The computer never shares a boxer, so it moves out of the way.
    expect(pick.state.picks[0]).not.toBe(pick.state.picks[1]);
    pick.update([guard(false), null], 900);
    pick.update([guard(true), null], 1000);
    expect(pick.update([guard(true), null], 1000 + LOCK_MS)).toEqual([0]);
    expect(pick.done).toBe(true);
  });

  it("does not lock in with a guard still up from calibration", () => {
    const pick = new PickControl([0, 1], [true, false]);
    pick.update([guard(true), null], 0);
    expect(pick.update([guard(true), null], LOCK_MS * 3)).toEqual([]);
    expect(pick.state.holding[0]).toBe(0);
    pick.update([guard(false), null], LOCK_MS * 3 + 10);
    pick.update([guard(true), null], LOCK_MS * 3 + 20);
    expect(pick.update([guard(true), null], LOCK_MS * 4 + 20)).toEqual([0]);
  });

  it("does not let two players take the same boxer", () => {
    const pick = new PickControl([0, 1], [true, true]);
    pick.step(0, 1);
    expect(pick.state.picks).toEqual([2, 1]);
  });

  it("ignores a second lean straight after the first", () => {
    const pick = new PickControl([0, 1], [true, false]);
    pick.onMove(lean(1, 1, 0));
    expect(pick.onMove(lean(1, 1, 100))).toBe(false);
  });
});

describe("records against the computer", () => {
  const win = (method: MatchResult["method"]): MatchResult => ({ winner: 0, method, round: 2, second: 30, cards: [], totals: [0, 0] });

  it("keeps the fastest knockout and the winning streak", () => {
    const first = addFight(EMPTY_RECORDS, win("KO"), 0, 90);
    expect(first.records).toMatchObject({ wins: 1, fastestKo: 90, streak: 1 });
    expect(first.best).toMatch(/first knockout/);
    const second = addFight(first.records, win("Decision"), 0, 180);
    expect(second.best).toBe("2 wins in a row");
    const loss = addFight(second.records, { ...win("KO"), winner: 1 }, 0, 50);
    expect(loss.records).toMatchObject({ losses: 1, streak: 0, fastestKo: 90 });
  });

  it("reads back only sensible numbers", () => {
    expect(parseRecords({ wins: 3, losses: -2, fastestKo: "x", streak: 1.7 })).toEqual({ wins: 3, losses: 0, fastestKo: null, streak: 1 });
    expect(parseRecords(null)).toEqual(EMPTY_RECORDS);
  });
});

describe("banners", () => {
  it("shows each player their own blocks and dodges, and nothing for the computer", () => {
    const banners = new Banners();
    banners.onEvent({ type: "block", fighter: 1, hand: "left", style: "jab", target: 0 }, 0, [true, false]);
    banners.onEvent({ type: "block", fighter: 0, hand: "left", style: "jab", target: 1 }, 0, [true, false]);
    expect(banners.current(100).map((b) => [b.text, b.fighter])).toEqual([["BLOCKED", 0]]);
    expect(banners.current(5000)).toEqual([]);
  });
});

describe("the knockout replay clock", () => {
  it("crawls through the blow and runs a few seconds in all", () => {
    expect(replayClock(0).t).toBeLessThan(-1000);
    const through = [0, 1000, 2000, 3000, 4000].map((ms) => replayClock(ms));
    expect(through.some((c) => c.slow < 0.3 && Math.abs(c.t) < 500)).toBe(true);
    expect(REPLAY_LENGTH).toBeGreaterThan(5000);
    expect(REPLAY_LENGTH).toBeLessThan(9000);
  });
});

describe("the fight driver", () => {
  it("pauses while a player is out of view and gives them a moment when they return", () => {
    const driver = new FightDriver({ seed: 3, slots: [1, null], introMs: 100 });
    driver.tick(0);
    driver.tick(500);
    driver.setPresent(1, false, 500);
    const before = driver.match.now;
    driver.tick(1500);
    expect(driver.match.now).toBe(before);
    // The host reports presence every frame, which must not keep putting the restart off.
    driver.setPresent(1, true, 1500);
    driver.tick(2000);
    driver.setPresent(1, true, 2000);
    expect(driver.match.now).toBe(before);
    driver.setPresent(1, true, 3100);
    driver.tick(3100);
    driver.tick(3300);
    expect(driver.match.now).toBeGreaterThan(before);
  });

  it("lets players walk off once the fight is decided", () => {
    const driver = new FightDriver({ seed: 3, slots: [1, 2], introMs: 100 });
    driver.tick(0);
    driver.stage = "results";
    driver.setPresent(1, false, 100);
    expect(driver.pausedFor).toEqual([]);
    expect(driver.paused).toBe(false);
  });

  it("turns a player's punch into a jab or a cross", () => {
    const driver = new FightDriver({ seed: 3, slots: [1, 2], introMs: 100 });
    const events: string[] = [];
    driver.listen((event) => {
      if (event.type === "throw") events.push(event.style);
    });
    for (let t = 0; t <= 1500; t += 100) driver.tick(t);
    expect(driver.punch(1, "left", true, 0.8)).toBe(true);
    for (let t = 1600; t <= 2400; t += 100) driver.tick(t);
    expect(driver.punch(2, "right", true, 0.8)).toBe(true);
    expect(events).toEqual(["jab", "cross"]);
    expect(ofType([], "hit")).toEqual([]);
  });
});
