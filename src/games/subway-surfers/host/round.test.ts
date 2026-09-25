import { describe, expect, it } from "vitest";
import { Countdown } from "./countdown";
import type { Intent } from "./controls";
import { resultsOf } from "./results";
import { CRASH_HOLD_S, GIVE_UP_S, RESUME_S, Round } from "./round";

const still: Intent = { lane: 0, jump: false, duck: false, ducking: false };

function play(round: Round, seconds: number, intents: Intent[] = [still, still]): void {
  for (let t = 0; t < seconds; t += 1 / 30) round.update(1 / 30, intents);
}

describe("round", () => {
  it("holds a player's run while they are out of view, then counts them back in", () => {
    const round = new Round(2, 42);
    play(round, 1);
    round.setAway(2, true);
    const held = round.seats[1]!.run.runner.distance;
    play(round, 2);
    expect(round.seats[1]!.run.runner.distance).toBe(held);
    expect(round.seats[0]!.run.runner.distance).toBeGreaterThan(held + 15);
    round.setAway(2, false);
    expect(round.paused(2)).toBe(true);
    play(round, RESUME_S + 0.2);
    expect(round.paused(2)).toBe(false);
    expect(round.seats[1]!.run.runner.distance).toBeGreaterThan(held);
  });

  it("is over only once every runner has crashed and the crash has played out", () => {
    const round = new Round(1, 42);
    // Standing still in the middle lane runs into something before long.
    play(round, 30, [still]);
    const run = round.seats[0]!.run;
    expect(run.crashed).not.toBeNull();
    expect(round.over).toBe(run.time - run.crashed!.time > CRASH_HOLD_S);
    play(round, CRASH_HOLD_S + 0.1, [still]);
    expect(round.over).toBe(true);
  });

  it("ends a two player round when one crashed and the other walked off for good", () => {
    const round = new Round(2, 42);
    round.setAway(2, true);
    play(round, 30);
    expect(round.seats[0]!.run.crashed).not.toBeNull();
    expect(round.seats[1]!.run.crashed).toBeNull();
    expect(round.over).toBe(true);
  });

  it("waits for a lone player who stepped out, however long", () => {
    const round = new Round(1, 42);
    round.setAway(1, true);
    play(round, GIVE_UP_S + 5, [still]);
    expect(round.over).toBe(false);
    expect(round.seats[0]!.run.runner.distance).toBe(0);
  });

  it("feeds camera moves to the tutorial in order", () => {
    const round = new Round(1, 1, true);
    const at = { slot: 1, time: 0 };
    expect(round.tutorialMove({ ...at, type: "jump", confidence: 1 })).toBe(false);
    expect(round.tutorialMove({ ...at, type: "lane", lane: -1, from: 0 })).toBe(true);
    expect(round.hud(["Ana"])[0]!.tutorial).toBe(1);
  });

  it("names the winner and keeps only named runs for the table", () => {
    const round = new Round(2, 42);
    play(round, 3, [{ ...still, lane: -1 }, still]);
    const { rows, winner, entries } = resultsOf(round, ["Ana", ""]);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Player 2"]);
    expect(entries.map((e) => e.slot)).toEqual([1]);
    expect(winner === null || winner === 1 || winner === 2).toBe(true);
  });
});

describe("countdown", () => {
  it("says each number once, then GO", () => {
    const count = new Countdown(3);
    const said: number[] = [];
    for (let i = 0; i < 40; i++) {
      const n = count.tick(0.1);
      if (n !== null) said.push(n);
    }
    expect(said).toEqual([2, 1, 0]);
  });
});
