import { describe, expect, it } from "vitest";
import { LevelBuilder } from "../engine/builder";
import { Round, type SongSync } from "./round";

const INFO = { id: "test", name: "Test", difficulty: 1, bpm: 120, theme: "test" } as const;

function level() {
  const b = new LevelBuilder(INFO, 10);
  b.jump(8).spikes(b.apex(8));
  return b.end(24).build();
}

/** A song clock the test moves by hand, recording every restart. */
class FakeSync implements SongSync {
  time = 0;
  restarts: { levelTime: number; lead: number }[] = [];
  songTime(): number {
    return this.time;
  }
  restart(levelTime: number, lead: number): void {
    this.restarts.push({ levelTime, lead });
    this.time = levelTime - lead;
  }
}

function play(round: Round, sync: FakeSync, until: number, jumps: Record<number, number[]> = {}) {
  while (sync.time < until) {
    sync.time += 1 / 60;
    for (const [slot, times] of Object.entries(jumps)) {
      if (times.some((t) => Math.abs(round.levelTime(Number(slot)) - t) < 1 / 120)) round.press(Number(slot));
    }
    round.update();
  }
}

describe("a round", () => {
  it("restarts the song from the top when a lone player crashes", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 1, false, sync);
    play(round, sync, 4.4);
    expect(round.status(1)).toBe("dead");
    for (let i = 0; i < 120 && sync.restarts.length === 0; i++) {
      sync.time += 1 / 60;
      round.update();
    }
    expect(sync.restarts).toEqual([{ levelTime: 0, lead: 0.05 }]);
    expect(round.run(1)!.attempt).toBe(2);
  });

  it("brings a crashed player back on a beat while the song plays on for two", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 8, { 2: [4] });
    expect(sync.restarts).toHaveLength(0);
    expect(round.status(2)).toBe("run");
    const offset = round.seats[0]!.offset;
    expect(offset).toBeGreaterThan(0);
    expect((offset / 0.5) % 1).toBeCloseTo(0, 6);
  });

  it("finishes when every player reaches the end", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 13, { 1: [4], 2: [4] });
    expect(round.over).toBe(true);
  });

  it("holds a player who steps away and picks up on the beat when they return", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 2);
    round.setAway(1, true);
    const x = round.run(1)!.player.x;
    play(round, sync, 5);
    expect(round.run(1)!.player.x).toBe(x);
    round.setAway(1, false);
    const offset = round.seats[0]!.offset;
    expect(sync.time + 1.5 - round.run(1)!.time).toBeLessThanOrEqual(offset + 1e-9);
    expect((offset / 0.5) % 1).toBeCloseTo(0, 6);
  });

  it("ignores jumps while a player waits to start", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 1, false, sync);
    sync.restart(0, 1);
    expect(round.press(1)).toBe(false);
  });

  it("keeps a player who steps out while crashed waiting at the start", () => {
    const sync = new FakeSync();
    const round = new Round(level(), 2, false, sync);
    play(round, sync, 4.4, { 1: [4] });
    expect(round.status(2)).toBe("dead");
    round.setAway(2, true);
    play(round, sync, 12, { 1: [4] });
    expect(round.status(2)).toBe("away");
    expect(round.run(2)!.attempt).toBe(2);
    expect(round.run(2)!.player.x).toBe(0);
    round.setAway(2, false);
    expect(round.status(2)).toBe("run");
  });
});
