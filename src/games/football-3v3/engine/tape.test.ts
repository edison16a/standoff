import { describe, expect, it } from "vitest";
import { createMatch, endReplay, stepMatch } from "./match";
import { PlayTape } from "./tape";

/** Plays computer teams until a touchdown thrown and caught, with the tape rolling. */
function firstPassingTouchdown(): PlayTape | null {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const state = createMatch([], { seed, level: "hard" });
    const tape = new PlayTape();
    for (let t = 0; t < 900 && state.phase !== "final"; t += 1 / 60) {
      stepMatch(state);
      tape.record(state);
      if (state.phase === "replay") {
        if (tape.hasScore() && tape.marks.throw !== null && state.lastScore?.kind === "touchdown" && state.lastScore.thrower !== null) return tape;
        endReplay(state);
      }
    }
  }
  return null;
}

describe("the play tape", () => {
  const tape = firstPassingTouchdown();

  it("holds a passing touchdown from the snap to the celebration", () => {
    expect(tape).not.toBeNull();
    const { marks, frames } = tape!;
    expect(marks.throw!).toBeGreaterThan(0);
    expect(marks.catch!).toBeGreaterThan(marks.throw!);
    expect(marks.score!).toBeGreaterThanOrEqual(marks.catch!);
    expect(frames.length).toBeGreaterThan(marks.score!);
    expect(frames[0]!.phase).toBe("live");
  });

  it("reads the throw like a broadcast: speed, spin and a tight spiral", () => {
    const facts = tape!.facts!;
    expect(facts.mph).toBeGreaterThan(30);
    expect(facts.mph).toBeLessThan(75);
    expect(facts.rpm).toBeGreaterThan(450);
    expect(facts.rpm).toBeLessThan(750);
    expect(facts.wobbleDeg).toBeLessThan(15);
  });

  it("sees the ball in the air, spinning, between the throw and the catch", () => {
    const { marks, frames } = tape!;
    const mid = frames[Math.floor((marks.throw! + marks.catch!) / 2)]!;
    expect(mid.ball.mode).toBe("spiral");
    expect(mid.ball.y).toBeGreaterThan(0.5);
  });
});
