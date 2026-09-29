import { describe, expect, it } from "vitest";
import { LevelBuilder } from "./builder";
import type { PlayerEvent } from "./player";
import { MAX_REWIND } from "./rewind";
import { Run } from "./run";

const INFO = { id: "test", name: "Test", difficulty: 1, bpm: 120, theme: "test" } as const;

function level() {
  const b = new LevelBuilder(INFO, 10);
  b.jump(8).spikes(b.apex(8));
  b.jump(16).spikes(b.apex(16));
  return b.end(24).build();
}

/** Steps a run frame by frame at 60 a second up to `until`, pressing at `pressAt` once the frame after `seenAt` comes. */
function play(pressAt: number, seenAt: number, until: number): { run: Run; events: PlayerEvent[] } {
  const run = new Run(level());
  const events: PlayerEvent[] = [];
  let pressed = false;
  for (let t = 0; t <= until + 1e-9; t += 1 / 60) {
    if (!pressed && t >= seenAt) {
      run.press(pressAt);
      pressed = true;
    }
    run.advanceTo(t, events);
  }
  return { run, events };
}

describe("a late press", () => {
  it("plays out as if it came on time", () => {
    const onTime = play(4, 0, 4.5).run.player;
    const late = play(4, 4 + MAX_REWIND * 0.8, 4.5).run.player;
    expect(late.y).toBeCloseTo(onTime.y, 6);
    expect(late.vy).toBeCloseTo(onTime.vy, 6);
    expect(late.angle).toBeCloseTo(onTime.angle, 6);
  });

  it("clears the spike it was meant for", () => {
    const { run } = play(4, 4 + 0.09, 6);
    run.press(8);
    run.advanceTo(13);
    expect(run.finished).toBe(true);
  });

  it("reaches back no further than the history keeps", () => {
    const stale = new Run(level());
    stale.advanceTo(3.8);
    stale.press(3.5);
    stale.advanceTo(3.9);
    const furthest = new Run(level());
    furthest.press(3.8 - MAX_REWIND);
    furthest.advanceTo(3.9);
    expect(stale.player.y).toBeCloseTo(furthest.player.y, 3);
  });

  it("sends each jump once, and nothing already heard again", () => {
    const { events } = play(4, 4.08, 4.5);
    expect(events.filter((e) => e.type === "jump")).toHaveLength(1);
    const onTime = play(4, 0, 4.5).events.map((e) => e.type);
    expect(events.map((e) => e.type)).toEqual(onTime);
  });

  it("keeps a press already used in the replayed steps", () => {
    const run = new Run(level());
    run.advanceTo(3.95);
    run.press(3.95);
    run.advanceTo(4.05);
    // A second jump seen late lands in the air and is buffered, while the first one still happened.
    run.press(4);
    run.advanceTo(4.1);
    expect(run.player.grounded).toBe(false);
    expect(run.jumps).toBe(1);
  });
});
