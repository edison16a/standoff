import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** Player 0 up top with the ball, player 4 (the Big Man) cutting hard down the lane, the defence far off. */
function cut(defenderOnCutter: boolean): Match {
  const m = new Match({ entries: ENTRIES, seed: 4, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 0.5, z: 11, vx: 0, vz: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 7.6 });
  Object.assign(m.athletes[4]!, { x: 2.4, z: 4.6, vx: -2.2, vz: -4.2 });
  m.athletes[4]!.move = { x: -0.45, z: -0.9 };
  if (defenderOnCutter) Object.assign(m.athletes[1]!, { x: 2.1, z: 4.0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.ball.pos = { x: 0.2, y: 1.1, z: 7.4 };
  return m;
}

describe("the alley oop", () => {
  it("lobs it up high to an open cutter, who catches it and goes straight up into the dunk", () => {
    const m = cut(false);
    m.press(0, "pass", { x: 1, z: -1 });
    const pass = m.events.find((e) => e.type === "pass");
    expect(pass && pass.type === "pass" && pass.lob).toBe(true);
    let finish: string | null = null;
    for (let t = 0; t < 2 && !finish; t += STEP) {
      m.step(STEP);
      const act = m.athletes[4]!.action;
      if (act.kind === "drive") finish = act.dunk ? `dunk:${act.style}` : `layup:${act.layup}`;
    }
    expect(finish).toBe("dunk:alley");
  });

  it("is a plain pass when a defender is on the cutter", () => {
    const m = cut(true);
    m.press(0, "pass", { x: 1, z: -1 });
    expect(m.alleyLob).toBeNull();
  });
});
