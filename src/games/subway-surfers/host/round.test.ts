import { describe, expect, it } from "vitest";
import { HEAD_START } from "../engine/difficulty";
import { SPEED } from "../engine/tuning";
import { Countdown } from "./countdown";
import type { Intent } from "./controls";
import { resultOf } from "./results";
import { CRASH_HOLD_S, RESUME_S, Round } from "./round";

const still: Intent = { lane: 0, jump: false, duck: false, ducking: false };

function play(round: Round, seconds: number, intent: Intent = still): void {
  for (let t = 0; t < seconds; t += 1 / 30) round.update(1 / 30, intent);
}

describe("round", () => {
  it("holds the run while the player is out of view, then counts them back in", () => {
    const round = new Round(42);
    play(round, 1);
    round.setAway(true);
    const held = round.run.runner.distance;
    play(round, 2);
    expect(round.run.runner.distance).toBe(held);
    round.setAway(false);
    expect(round.paused).toBe(true);
    play(round, RESUME_S + 0.2);
    expect(round.paused).toBe(false);
    expect(round.run.runner.distance).toBeGreaterThan(held);
  });

  it("is over only once the runner has crashed and the crash has played out", () => {
    const round = new Round(42);
    // Standing still in the middle lane runs into something before long.
    play(round, 30);
    const run = round.run;
    expect(run.crashed).not.toBeNull();
    expect(round.over).toBe(run.time - run.crashed!.time > CRASH_HOLD_S);
    play(round, CRASH_HOLD_S + 0.1);
    expect(round.over).toBe(true);
  });

  it("waits for a player who stepped out, however long", () => {
    const round = new Round(42);
    round.setAway(true);
    play(round, 40);
    expect(round.over).toBe(false);
    expect(round.run.runner.distance).toBe(0);
  });

  it("starts at the chosen difficulty's pace", () => {
    expect(new Round(42).run.speed).toBe(SPEED.start);
    expect(new Round(42, { headStart: HEAD_START.hard }).run.speed).toBeGreaterThan(SPEED.start + 15);
  });

  it("feeds camera moves to the tutorial in order", () => {
    const round = new Round(1, { practice: true });
    const at = { slot: 1, time: 0 };
    expect(round.tutorialMove({ ...at, type: "jump", confidence: 1 })).toBe(false);
    expect(round.tutorialMove({ ...at, type: "lane", lane: -1, from: 0 })).toBe(true);
    expect(round.hud("Ana").tutorial).toBe(1);
  });

  it("keeps only a named run for the table", () => {
    const round = new Round(42);
    play(round, 3, { ...still, lane: -1 });
    const named = resultOf(round, "Ana", "medium");
    expect(named.row).toMatchObject({ name: "Ana", difficulty: "medium" });
    expect(named.entry?.name).toBe("Ana");
    const unnamed = resultOf(round, "", "easy");
    expect(unnamed.row.name).toBe("Player 1");
    expect(unnamed.entry).toBeNull();
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
