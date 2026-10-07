import { describe, expect, it } from "vitest";
import { simulateBotGames } from "./bot-games";
import { runStepbackDrill } from "./stepback-drill";
import { rate } from "./summary";
import type { ShotRecord } from "./shot-log";

const mean = (shots: readonly ShotRecord[]) => shots.reduce((s, x) => s + x.contest, 0) / Math.max(1, shots.length);

/**
 * Play testers found scoring too easy: a stepback beat any defence. These
 * pin the game inside sane bands, measured on the real engine. Before the
 * fix, sixty computer games scored 1.25 points a trip on Easy and 1.42 on
 * Hard, and a stepback shook its man two times in three.
 */
describe("how hard it is to score in computer games", () => {
  // The same twenty seeds scored 1.19 and 1.37 a trip before; a game is a coin flip of runs, so the bands are wide.
  it.each([
    ["easy", 0.85, 1.16],
    ["hard", 0.95, 1.33],
  ] as const)("keeps %s games to a fair number of points a trip", (level, low, high) => {
    const s = simulateBotGames(20, level);
    expect(s.ppp).toBeGreaterThan(low);
    expect(s.ppp).toBeLessThan(high);
    // A defender within reach costs a jumper most of its chance; room to shoot still pays.
    const { tight, close, open } = s.jumpersBySpace;
    expect(tight.pct).toBeLessThan(0.33);
    expect(close.attempts + open.attempts).toBeGreaterThan(10);
    expect((close.made + open.made) / (close.attempts + open.attempts)).toBeGreaterThan(tight.pct + 0.1);
    // A layup at a man is a fight; a dunk is still the surest shot there is.
    expect(s.layupsBySpace.tight.pct).toBeLessThan(0.52);
    expect(s.layupsBySpace.tight.pct).toBeGreaterThan(0.25);
    expect(s.byType.dunk.pct).toBeGreaterThan(0.55);
    // Stepbacks shake their man far less than the two in three they used to.
    expect(s.stepbackShakeRate).toBeLessThan(0.35);
    expect(s.stepback.pct).toBeLessThan(0.45);
    // Twenty whole games: about ten seconds, longer on a busy machine.
  }, 90000);
});

describe("the stepback against a defender", () => {
  it.each(["bot", "guard"] as const)("rarely shakes a %s who stays home, and the shot is contested", (defender) => {
    const r = runStepbackDrill({ defender, play: "move", reps: 120 });
    expect(r.shakes / 120).toBeLessThan(0.35);
    expect(r.shakes / 120).toBeGreaterThan(0.08);
    expect(rate(r.held).pct).toBeLessThan(0.48);
    expect(mean(r.held)).toBeGreaterThan(0.5);
  }, 30000);

  it.each(["bot", "guard"] as const)("buys real space off a %s who bit", (defender) => {
    const r = runStepbackDrill({ defender, play: "move", bite: true, reps: 120 });
    const tries = r.shaken.length + r.held.length;
    expect(r.shaken.length / tries).toBeGreaterThan(0.45);
    expect(mean(r.shaken)).toBeLessThan(0.3);
    expect(rate(r.shaken).pct).toBeGreaterThan(rate(r.held).pct + 0.1);
  }, 30000);

  it("makes a hop off a man in the chest a poor shot", () => {
    const r = runStepbackDrill({ defender: "bot", play: "hop", reps: 120 });
    expect(rate(r.shots).pct).toBeLessThan(0.42);
  }, 30000);
});
