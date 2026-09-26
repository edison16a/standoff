import { describe, expect, it } from "vitest";
import { moveOf } from "../../engine/moves";
import { fightNow, place, run } from "../../engine/test-kit";
import type { Command } from "../../engine/types";
import { STEP } from "../../engine/tuning";
import type { CharacterId } from "../../roster";
import { PoseDriver } from "./drive";
import { CHANNELS, type Pose } from "./pose";
import { strikePose } from "./strike";
import { STYLES } from "./styles";

/** How far the joints moved between two drawn frames, summed, whole body turns aside. */
function jump(a: Pose, b: Pose): number {
  let sum = 0;
  for (const c of CHANNELS) if (c !== "flip" && c !== "spin") sum += Math.abs(a[c] - b[c]);
  return sum;
}

/**
 * Plays a script for fighter 0 against a partner who stands still, and
 * draws fighter 0 at three screen frames per engine step. Returns the
 * joint jump on every drawn frame, and the steps where a new swing began.
 */
function film(character: CharacterId, script: [number, Command][], steps: number) {
  const state = fightNow([character, "bear"]);
  const [f, partner] = state.fighters;
  place(f!, 0, 1);
  place(partner!, 1.2, -1);
  const driver = new PoseDriver(STYLES[character]);
  const jumps: number[] = [];
  const starts: number[] = [];
  const poses: Pose[] = [];
  let last = { ...driver.pose };
  for (let i = 0; i < steps; i++) {
    const swing = f!.swing;
    run(state, 1, (id) => (id === 0 ? script.find(([at]) => at === i)?.[1] : undefined));
    if (f!.swing !== swing) starts.push(i);
    for (let k = 0; k < 3; k++) {
      const pose = driver.update(f!, { step: state.frame, alpha: k / 3, dt: STEP / 3, time: (i + k / 3) * STEP, winner: false, appearing: false });
      jumps.push(jump(last, pose));
      last = { ...pose };
      poses.push(last);
    }
  }
  return { jumps, starts, poses };
}

const light = (x = 0, y = 0): Command => ({ x, y, light: true });

describe("drawn frames through a string", () => {
  for (const character of ["karate", "samurai", "mage", "bear"] as const) {
    it(`${character}: each cancel travels about straight from one swing into the next`, () => {
      const chain = film(character, [[0, light()], [2, light(1)], [3, light(1)], [9, light(0, 1)], [16, { x: 0, y: 0, heavy: true }]], 90);
      expect(chain.starts.length).toBeGreaterThanOrEqual(2);
      for (const start of chain.starts.slice(1)) {
        // From the cancel to six steps on: the path the joints take against the straight line.
        const a = start * 3;
        const b = a + 18;
        const path = chain.jumps.slice(a + 1, b + 1).reduce((sum, j) => sum + j, 0);
        const direct = jump(chain.poses[a]!, chain.poses[b]!);
        // A snap back to the stance before the next wind up would make the path far longer than the line.
        expect(path).toBeLessThan(direct * 2.2 + 0.1);
      }
    });
  }
});

describe("a cancelled swing", () => {
  it("starts from the pose the last swing left, not the stance", () => {
    const style = STYLES.karate;
    const stance = { ...film("karate", [], 1).poses[0]! };
    const from = { ...stance, armRRaise: 1.4, elbowR: 0.2 };
    const pose = strikePose(style.moves.side, moveOf("karate", "side"), 0, stance, from);
    expect(pose.armRRaise).toBeCloseTo(1.4);
    const fresh = strikePose(style.moves.side, moveOf("karate", "side"), 0, stance);
    expect(fresh.armRRaise).toBeCloseTo(stance.armRRaise);
  });
});
