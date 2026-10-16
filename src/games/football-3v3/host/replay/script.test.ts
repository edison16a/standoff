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

describe("the touchdown replay's script", () => {
  it("is one shot of a passing touchdown, from the QB set through the catch to the run in", () => {
    const script = scriptReplay(clip({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 4.2 } }), WR)!;
    expect(script.segments).toHaveLength(1);
    const shot = script.segments[0]!;
    expect(shot.angle).toBe("trace");
    // Opens with the QB set, a beat before his throwing motion, and plays past the line as the scorer eases up.
    expect(shot.from).toBeLessThan(2.4);
    expect(shot.from).toBeGreaterThanOrEqual(1);
    expect(shot.to).toBeGreaterThan(8.5);
    expect(script.passer).toBe(QB);
    expect(script.length).toBeCloseTo(shot.to - shot.from, 6);
  });

  it("is one chase of a touchdown on the ground", () => {
    const script = scriptReplay(clip({ snap: 1, td: 5 }), WR)!;
    expect(script.segments.map((s) => s.angle)).toEqual(["run"]);
    expect(script.segments[0]!.from).toBeLessThan(1);
    expect(script.passer).toBeNull();
  });

  it("keeps a long run to its last six seconds", () => {
    const script = scriptReplay(clip({ snap: 1, td: 15 }), WR)!;
    const shot = script.segments[0]!;
    expect(15 - shot.from).toBeLessThanOrEqual(6 + 1e-6);
  });

  it("ends a beat into the scorer's celebration", () => {
    const frames = clip({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 7.9 } });
    for (const f of frames) if (f.time >= 8.3) (f.athletes[1] as { action: string }).action = "celebrate";
    const shot = scriptReplay(frames, WR)!.segments[0]!;
    expect(shot.to).toBeGreaterThan(8.3);
    expect(shot.to).toBeLessThan(8.3 + 0.45);
  });

  it("has nothing to show for a score with no live play before it", () => {
    expect(scriptReplay(clip({ snap: 0, td: 0 }), WR)).toBeNull();
  });

  it("plays straight through the clip at full speed", () => {
    const script = scriptReplay(clip({ snap: 1, td: 8, pass: { windup: 2.4, release: 2.8, catch: 4.2 } }), WR)!;
    const shot = script.segments[0]!;
    expect(locate(script, 1)!.time).toBeCloseTo(shot.from + 1, 6);
    expect(locate(script, 99)!.time).toBeCloseTo(shot.to, 6);
  });
});
