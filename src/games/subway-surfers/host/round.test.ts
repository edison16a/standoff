import { describe, expect, it } from "vitest";
import { memoryBoards, readBoard } from "@/games/kit/leaderboard";
import { COIN, SPEED } from "../engine/tuning";
import { Countdown } from "./countdown";
import type { Intent } from "./controls";
import { recordResult, RUNS_BOARD } from "./results";
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
    expect(new Round(42).run.paceAt(0)).toBe(SPEED.start);
    expect(new Round(42, { difficulty: "hard" }).run.paceAt(0)).toBeGreaterThan(SPEED.start + 15);
    expect(new Round(42, { difficulty: "demon" }).hud("Ana").difficulty).toBe("demon");
  });

  it("pops up the points coins win, adding up a quick run of them", () => {
    const round = new Round(1, { practice: true });
    for (const z of [3, 4.5]) round.run.course.addCoin(0, COIN.y, z);
    expect(round.hud("Ana").gain).toBeNull();
    // Two coins a moment apart, at a jog.
    while (round.run.coins < 2) play(round, 0.05);
    const gain = round.hud("Ana").gain;
    expect(gain?.amount).toBe(2 * COIN.points);
    play(round, 1);
    expect(round.hud("Ana").gain).toBeNull();
  });

  it("feeds camera moves to the tutorial in order", () => {
    const round = new Round(1, { practice: true });
    const at = { slot: 1, time: 0 };
    expect(round.tutorialMove({ ...at, type: "jump", confidence: 1 })).toBe(false);
    expect(round.tutorialMove({ ...at, type: "lane", lane: -1, from: 0 })).toBe(true);
    expect(round.hud("Ana").tutorial).toBe(1);
  });

  it("saves every finished run to the leaderboard, named or not", () => {
    const storage = memoryBoards();
    const round = new Round(42, { difficulty: "medium" });
    play(round, 3, { ...still, lane: -1 });
    const named = recordResult(round, "Ana", "camera", storage);
    expect(named).toMatchObject({ name: "Ana", difficulty: "medium", rank: 1, total: 1, best: true });
    expect(named.score).toBe(named.points.running + named.points.coins + named.points.powers);
    const unnamed = recordResult(new Round(7), "", "keyboard", storage);
    expect(unnamed).toMatchObject({ name: "Player 1", rank: 2, total: 2, best: false });
    const board = readBoard(RUNS_BOARD, storage);
    expect(board.map((entry) => entry.tag)).toEqual(["Medium", "Easy, keys"]);
    expect(board[0]!.id).toBe(named.entryId);
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
