import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { Match, type Entry } from "../engine/match";
import { ReplayTape } from "../engine/replay-tape";
import { STEP } from "../engine/tuning";
import { MatchDriver } from "./match-driver";
import { Replay, REPLAY_SPEED } from "./replay";

const ENTRIES: Entry[] = [
  { team: 0, build: "shooter", seat: 1 },
  { team: 0, build: "dunker", seat: null },
  { team: 0, build: "playmaker", seat: null },
  { team: 1, build: "lockdown", seat: 2 },
  { team: 1, build: "allround", seat: null },
  { team: 1, build: "big", seat: null },
];

/** A few seconds of a computer game on tape. */
function taped(seconds: number): { m: Match; tape: ReplayTape } {
  const m = new Match({ entries: ENTRIES.map((e) => ({ ...e, seat: null })), seed: 4 });
  const tape = new ReplayTape();
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    tape.record(m, m.drainEvents());
  }
  return { m, tape };
}

describe("the replay tape", () => {
  it("keeps copies the game moving on never changes", () => {
    const { m, tape } = taped(4);
    const frame = tape.clip(m.time - 1, m.time)[0]!;
    const x = frame.athletes[0]!.x;
    m.athletes[0]!.x += 5;
    expect(frame.athletes[0]!.x).toBe(x);
    expect(tape.clip(0, m.time).length).toBeGreaterThan(200);
  });
});

describe("the replay", () => {
  it("plays the clip twice in slow motion, from the scorer's view and then the defender's", () => {
    const { m, tape } = taped(5);
    const frames = tape.clip(m.time - 2, m.time);
    const heard: MatchEvent[] = [];
    const r = new Replay({ entries: ENTRIES, scorer: 0, defender: 3, voters: () => [] }, frames, (e) => heard.push(e));
    const views = new Set<string>();
    let real = 0;
    while (!r.done && real < 30) {
      r.tick(1 / 60);
      views.add(r.view);
      real += 1 / 60;
    }
    expect([...views]).toEqual(["scorer", "defender"]);
    // Two passes of two seconds at the replay's speed.
    expect(real).toBeGreaterThan((2 * 2) / REPLAY_SPEED - 0.5);
    expect(r.camera()).not.toBeNull();
  });

  it("has its camera placed before the first frame is drawn", () => {
    const { m, tape } = taped(3);
    const r = new Replay({ entries: ENTRIES, scorer: 0, defender: 3, voters: () => [] }, tape.clip(m.time - 1, m.time), () => {});
    expect(r.camera()).not.toBeNull();
  });

  it("is skipped only once every player has pressed a button", () => {
    const { m, tape } = taped(3);
    const r = new Replay({ entries: ENTRIES, scorer: 0, defender: 3, voters: () => [1, 2] }, tape.clip(m.time - 2, m.time), () => undefined);
    r.skip(1);
    expect(r.done).toBe(false);
    r.skip(7);
    expect(r.done).toBe(false);
    r.skip(2);
    expect(r.done).toBe(true);
  });

  it("asks only the phones still in the game", () => {
    const { m, tape } = taped(3);
    let voters = [1, 2];
    const r = new Replay({ entries: ENTRIES, scorer: 0, defender: 3, voters: () => voters }, tape.clip(m.time - 2, m.time), () => undefined);
    r.skip(1);
    // Player 2's phone drops: the one left has agreed, so it skips.
    voters = [1];
    r.tick(1 / 30);
    expect(r.done).toBe(true);
    // A phone that comes back mid replay gets a say before it can skip.
    let back = [1];
    const again = new Replay({ entries: ENTRIES, scorer: 0, defender: 3, voters: () => back }, tape.clip(m.time - 2, m.time), () => undefined);
    back = [1, 2];
    again.skip(1);
    expect(again.done).toBe(false);
    again.skip(2);
    expect(again.done).toBe(true);
  });
});

describe("the driver after the winning basket", () => {
  it("rolls the replay, shows it as its own phase, and goes on to the results when everyone skips", () => {
    const driver = new MatchDriver(ENTRIES, 6, "hard");
    // Both phones' players go to the computer, so the game plays itself to the end.
    driver.setOnline(1, false);
    driver.setOnline(2, false);
    driver.match.score = [driver.match.target - 1, driver.match.target - 1];
    let replayed = false;
    let waited = false;
    for (let t = 0; t < 120 && !replayed; t += 1 / 30) {
      driver.tick(1 / 30, () => ({ x: 0, y: 0 }));
      replayed = driver.replays.replay !== null;
      // Between the win and the replay the winners have their moment, and the replay is still to come.
      if (driver.match.phase === "over" && !replayed) waited ||= driver.replays.pending;
    }
    expect(replayed).toBe(true);
    expect(waited).toBe(true);
    expect(driver.replays.pending).toBe(false);
    expect(driver.view).toBe(driver.replays.replay!.ghost);
    // Nobody is left to vote, so it plays out on its own.
    for (let t = 0; t < 40 && driver.replays.replay; t += 1 / 30) driver.tick(1 / 30, () => ({ x: 0, y: 0 }));
    expect(driver.replays.replay).toBeNull();
    expect(driver.view).toBe(driver.match);
    expect(driver.match.phase).toBe("over");
  });
});
