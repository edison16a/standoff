import { describe, expect, it } from "vitest";
import type { MatchView } from "../../engine/view";
import { locate, scriptReplay } from "./script";

const STEP = 1 / 30;
const QB = 0;
const WR = 1;

interface Beat {
  /** Seconds after the clip starts. */
  snap: number;
  td: number;
  /** A pass: the throwing motion starts, the ball leaves the hand, the receiver has it. */
  pass?: { windup: number; release: number; catch: number };
}

/**
 * A clip of stills with only what the replay reads: the phase, the
 * ball's state and holder, and the QB's throwing motion. Everything
 * before the snap is the line set, everything from the score on is the
 * celebration.
 */
function clip(beat: Beat, length = beat.td + 3): MatchView[] {
  const frames: MatchView[] = [];
  for (let t = 0; t <= length + 1e-9; t += STEP) {
    const phase = t < beat.snap ? "presnap" : t < beat.td ? "live" : "touchdown";
    const p = beat.pass;
    const flying = !!p && t >= p.release && t < p.catch;
    const holder = !p || t >= p.catch ? WR : QB;
    const throwing = !!p && t >= p.windup && t < p.release;
    frames.push({
      time: t,
      phase,
      ball: { state: flying ? "pass" : "held", holder: flying ? null : holder, pitch: false },
      athletes: [{ id: QB, action: throwing ? "throw" : "none" }, { id: WR, action: "none" }],
    } as unknown as MatchView);
  }
  return frames;
}

const angles = (beat: Beat) => scriptReplay(clip(beat), WR)!.segments.map((s) => `${s.take}:${s.angle}`);

describe("the touchdown replay's script", () => {
  it("shows a passing touchdown wide, then behind the QB, at the catch and from the end zone", () => {
    expect(angles({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 4.2 } })).toEqual(["0:all22", "1:qb", "1:catch", "1:endzone"]);
  });

  it("leaves out the end zone camera when the catch is at the line", () => {
    expect(angles({ snap: 1, td: 4.4, pass: { windup: 2.4, release: 2.8, catch: 4.2 } })).toEqual(["0:all22", "1:qb", "1:catch"]);
  });

  it("shows a run wide, then chased, then met at the end zone", () => {
    expect(angles({ snap: 1, td: 9 })).toEqual(["0:all22", "1:chase", "1:endzone"]);
  });

  it("opens wide on the line set before the snap and plays every shot long enough to read", () => {
    const script = scriptReplay(clip({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 4.2 } }), WR)!;
    expect(script.segments[0]!.from).toBeLessThan(1);
    for (const s of script.segments) expect(s.to - s.from).toBeGreaterThanOrEqual(0.7 - 1e-6);
    expect(script.passer).toBe(QB);
    expect(script.length).toBeCloseTo(script.segments.reduce((n, s) => n + s.to - s.from, 0), 6);
  });

  it("keeps the wide take to nine seconds on a long run", () => {
    const script = scriptReplay(clip({ snap: 1, td: 15 }), WR)!;
    const wide = script.segments[0]!;
    expect(wide.to - wide.from).toBeLessThanOrEqual(9 + 0.8 + 1e-6);
  });

  it("has nothing to show for a score with no live play before it", () => {
    expect(scriptReplay(clip({ snap: 0, td: 0 }), WR)).toBeNull();
  });

  it("starts the play over at the second take", () => {
    const script = scriptReplay(clip({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 4.2 } }), WR)!;
    const wide = script.segments[0]!;
    const spot = locate(script, wide.to - wide.from + 0.01)!;
    expect(spot.segment.take).toBe(1);
    expect(spot.time).toBeLessThan(wide.to - 2);
  });
});
