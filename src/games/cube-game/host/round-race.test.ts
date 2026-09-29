import { describe, expect, it } from "vitest";
import { LevelBuilder } from "../engine/builder";
import { Round, type SongSync } from "./round";

const INFO = { id: "race", name: "Race", difficulty: 1, bpm: 120, theme: "test" } as const;

/** Twelve seconds long, with one spike at four seconds. */
function level() {
  const b = new LevelBuilder(INFO, 10);
  b.jump(8).spikes(b.apex(8));
  return b.end(24).build();
}

class FakeSync implements SongSync {
  time = 0;
  songTime(): number {
    return this.time;
  }
  restart(levelTime: number, lead: number): void {
    this.time = levelTime - lead;
  }
}

/** Steps the song at 60 frames a second, pressing for each slot at its own level times. */
function play(round: Round, sync: FakeSync, until: number, jumps: Record<number, number[]> = {}) {
  while (sync.time < until) {
    sync.time += 1 / 60;
    for (const [slot, times] of Object.entries(jumps)) {
      if (times.some((t) => Math.abs(round.levelTime(Number(slot)) - t) < 1 / 120)) round.press(Number(slot));
    }
    round.update();
  }
}

describe("a two player race", () => {
  it("lets a crashed player restart while the other keeps going", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 4.4, { 1: [4] });
    expect(round.status(1)).toBe("run");
    expect(round.status(2)).toBe("dead");
    play(round, sync, 6, { 1: [4] });
    expect(round.status(2)).toBe("run");
    expect(round.run(2)!.attempt).toBe(2);
    expect(round.places()).toEqual([1, 2]);
  });

  it("goes to the player who never crashed, and stops the other where they are", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    // Player 2 misses the spike once, then clears it on the next attempt.
    play(round, sync, 5, { 1: [4] });
    play(round, sync, 13, { 1: [4], 2: [4] });
    expect(round.over).toBe(true);
    const x = round.run(2)!.player.x;
    play(round, sync, 20, { 1: [4], 2: [4] });
    expect(round.winner).toBe(1);
    expect(round.status(1)).toBe("done");
    expect(round.status(2)).toBe("beaten");
    expect(round.run(2)!.player.x).toBe(x);
    expect(round.places()).toEqual([1, 2]);
  });

  it("gives the win to whoever lost less time, even player 2", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 2, { 1: [4], 2: [4] });
    round.setAway(1, true);
    play(round, sync, 3, { 1: [4], 2: [4] });
    round.setAway(1, false);
    play(round, sync, 20, { 1: [4], 2: [4] });
    expect(round.winner).toBe(2);
    expect(round.status(1)).toBe("beaten");
  });

  it("calls a dead heat when both cross on the same step", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    const seats = round.seats;
    play(round, sync, 13, { 1: [4], 2: [4] });
    expect(seats[0]!.finishAt).toBeCloseTo(seats[1]!.finishAt!, 9);
    expect(round.over).toBe(true);
    expect(round.winner).toBeNull();
  });
});
