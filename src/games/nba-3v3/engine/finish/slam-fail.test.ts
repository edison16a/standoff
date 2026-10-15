import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { RIM_SPOT } from "../court";
import { startDrive } from "../drive";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";

const ENTRIES: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** The Dunker (id 1) going up for a rim hang that was judged to go down, everyone else far off. */
function hangDunk(): Match {
  const m = new Match({ entries: ENTRIES, seed: 9, firstOffence: 1 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 1 ? RIM_SPOT.x : -6 + i, z: i === 1 ? RIM_SPOT.z + 2.4 : 11, vx: 0, vz: i === 1 ? -5 : 0, action: { kind: "none" } }));
  m.ball.holder = 1;
  m.forcedFinish = { dunk: "rimhang" };
  m.forcedDunk = "make";
  startDrive(m, m.athletes[1]!);
  return m;
}

/**
 * A slam can still miss after the gather: a hand knocks it off line, a
 * foul, or a man in the air meets it. The body must not finish a made
 * dunk's hang over a ball rimming out; it plays the fail from the slam.
 */
describe("a slam that does not go down", () => {
  it("plays the clang from the slam on, letting go of the rim", () => {
    const m = hangDunk();
    const a = m.athletes[1]!;
    const act = a.action;
    if (act.kind !== "drive") throw new Error("no drive");
    expect(act.rimHang).toBeGreaterThan(0);
    while (act.t + STEP < act.finish) m.step(STEP);
    // Knocked off line at the slam.
    m.forced = "rimOut";
    m.drainEvents();
    m.step(STEP);
    m.step(STEP);
    expect(m.drainEvents().some((e) => e.type === "dunkFail" && e.fail === "clang")).toBe(true);
    expect(act.released).toBe(true);
    expect(act.fail).toBe("clang");
    expect(act.rimHang).toBe(0);
  });

  it("plays the clang, not the stuff, when the stopper never got to the slam", () => {
    const m = new Match({ entries: ENTRIES, seed: 9, firstOffence: 1 });
    while (m.phase !== "live") m.step(STEP);
    m.athletes.forEach((a, i) => Object.assign(a, { x: i === 1 ? RIM_SPOT.x : -6 + i, z: i === 1 ? RIM_SPOT.z + 2.4 : 11, vx: 0, vz: i === 1 ? -5 : 0, action: { kind: "none" } }));
    // A man on the other team waits under the ring for the stuff.
    const man = m.opponents(1)[0]!;
    Object.assign(man, { x: RIM_SPOT.x, z: RIM_SPOT.z + 0.6 });
    m.ball.holder = 1;
    m.forcedFinish = { dunk: "twoHand" };
    m.forcedDunk = "stuff";
    startDrive(m, m.athletes[1]!);
    const act = m.athletes[1]!.action;
    if (act.kind !== "drive") throw new Error("no drive");
    expect(act.fail).toBe("stuff");
    while (act.t + STEP < act.finish) m.step(STEP);
    // Knocked well off his spot just before the slam.
    man.x += 3;
    m.drainEvents();
    m.step(STEP);
    const events = m.drainEvents();
    expect(events.some((e) => e.type === "dunkFail" && e.fail === "clang" && e.by === null)).toBe(true);
    expect(events.some((e) => e.type === "block")).toBe(false);
    expect(act.fail).toBe("clang");
  });

  it("leaves a slam that goes down alone", () => {
    const m = hangDunk();
    const act = m.athletes[1]!.action;
    if (act.kind !== "drive") throw new Error("no drive");
    while (act.t + STEP < act.finish) m.step(STEP);
    m.forced = "bounce";
    m.step(STEP);
    m.step(STEP);
    expect(act.fail).toBeNull();
    expect(act.rimHang).toBeGreaterThan(0);
  });
});
