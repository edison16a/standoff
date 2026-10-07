import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { botReading, meterView } from "./meter-live";
import { gradeLevel, gradeThrow, holdChance, meterLevel, meterWindow, METER, passQuality, PLAIN } from "./pass-meter";
import { botSkill } from "./bots/skill";
import { BOTS, bySeat, peopleMatch, run, snap } from "./test-helpers";
import { STEP } from "./tuning";

/** Milliseconds held that stop the marker at `level` on its way up. */
const heldAt = (level: number) => level * METER.sweepMs;

describe("the throw meter", () => {
  it("climbs, falls back and climbs again, so the QB can take his time", () => {
    expect(meterLevel(0)).toBe(0);
    expect(meterLevel(METER.sweepMs / 2)).toBeCloseTo(0.5);
    expect(meterLevel(METER.sweepMs)).toBeCloseTo(1);
    expect(meterLevel(METER.sweepMs * 1.25)).toBeCloseTo(0.75);
    expect(meterLevel(METER.sweepMs * 2.5)).toBeCloseTo(0.5);
  });

  it("grades gold, green, weak and hot", () => {
    expect(gradeThrow(heldAt(METER.center), 5).grade).toBe("perfect");
    expect(gradeThrow(heldAt(METER.center + 0.04), 5).grade).toBe("good");
    expect(gradeThrow(heldAt(0.4), 5).grade).toBe("weak");
    expect(gradeThrow(heldAt(0.98), 5).grade).toBe("hot");
    // On the way back down the marker passes the green again.
    expect(gradeThrow(METER.sweepMs * 2 - heldAt(METER.center), 5).grade).toBe("perfect");
  });

  it("makes gold far harder to hit than green, and gives a better arm more green", () => {
    const w = meterWindow(5);
    expect(w.gold * 4).toBeLessThan(w.green);
    expect(meterWindow(10).green).toBeGreaterThan(meterWindow(2).green);
    expect(meterWindow(10).gold).toBe(meterWindow(2).gold);
    // The gold window is under thirty milliseconds of the marker's run.
    expect(w.gold * 2 * METER.sweepMs).toBeLessThan(30);
  });

  it("grows a miss the further the marker stopped from the green", () => {
    const w = meterWindow(5);
    const near = gradeLevel(w.center - w.green - 0.02, w);
    const far = gradeLevel(0.1, w);
    expect(near.grade).toBe("weak");
    expect(far.miss).toBeGreaterThan(near.miss);
    expect(far.miss).toBeLessThanOrEqual(1);
  });
});

describe("pass quality from the timing", () => {
  const perfect = passQuality({ grade: "perfect", miss: 0 });
  const good = passQuality({ grade: "good", miss: 0 });
  const weak = passQuality({ grade: "weak", miss: 0.6 });
  const hot = passQuality({ grade: "hot", miss: 0.6 });

  it("throws gold on a tighter line than green, and green tighter than a miss", () => {
    expect(perfect.line).toBeLessThan(good.line);
    expect(good.line).toBeLessThan(PLAIN.line);
    expect(weak.line).toBeGreaterThan(PLAIN.line);
    expect(hot.line).toBeGreaterThan(PLAIN.line);
    expect(perfect.wobble).toBeLessThan(weak.wobble);
  });

  it("fires a hot ball, floats a weak one", () => {
    expect(hot.time).toBeLessThan(good.time);
    expect(weak.time).toBeGreaterThan(PLAIN.time);
  });

  it("makes gold the surest catch and a hot ball the hardest to hold", () => {
    const p = 0.8;
    expect(holdChance(p, perfect)).toBeGreaterThan(holdChance(p, good));
    expect(holdChance(p, good)).toBeGreaterThan(p);
    expect(holdChance(p, hot)).toBeLessThan(p);
    expect(holdChance(p, PLAIN)).toBeCloseTo(p);
  });

  it("gives defenders nothing to read on gold and plenty on a floater", () => {
    expect(perfect.read).toBe(0);
    expect(perfect.pick).toBeLessThan(good.pick);
    expect(weak.pick).toBeGreaterThan(PLAIN.pick);
    expect(weak.read).toBeGreaterThan(PLAIN.read);
  });
});

describe("the meter in a match", () => {
  it("runs while the QB holds the throw and stops where he let go", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    m.holdThrow(qb.id, true);
    run(m, 0.5);
    expect(meterView(m)?.level).toBeCloseTo(meterLevel(500), 1);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    m.step(STEP);
    m.setAim(qb.id, null, heldAt(METER.center));
    expect(meterView(m)?.grade).toBe("perfect");
    run(m, 1, () => m.ball.state === "pass");
    expect(m.ball.pass?.quality.grade).toBe("perfect");
    expect(m.ball.pass?.interceptor).toBe(null);
  });

  it("drops the meter when the QB takes off instead", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.holdThrow(qb.id, true);
    m.step(STEP);
    m.press(qb.id, "run");
    m.step(STEP);
    expect(m.meter).toBe(null);
  });

  it("lets better computer QBs hit the green more often", () => {
    const hits = (level: "easy" | "hard") => {
      const m = new Match({ entries: BOTS, seed: 5, level });
      const qb = m.qbOf(0);
      let green = 0;
      for (let i = 0; i < 400; i++) {
        const g = botReading(m, qb, botSkill(level)).grade;
        if (g === "good" || g === "perfect") green++;
      }
      return green;
    };
    expect(hits("hard")).toBeGreaterThan(hits("easy") + 40);
  });
});
