import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import type { MatchEvent } from "./events";
import { callShootingFoul } from "./foul-call";
import { Match, type Entry } from "./match";
import type { Outcome } from "./shot-model";
import { rollShootingFoul } from "./shooting-foul";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));

/** Player 0 up for a jumper from `z` straight out from the rim, defender 1 in his face. */
function shooting(seed: number, z = 6.5): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z, yaw: Math.PI });
  Object.assign(m.athletes[1]!, { x: 0, z: z - 0.8, yaw: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

/** Fouls the shot, lets it fly with a set outcome, and plays on until the free throws are set up. */
function fouledShot(outcome: Outcome, z = 6.5): { m: Match; events: MatchEvent[] } {
  const m = shooting(2, z);
  const events: MatchEvent[] = [];
  m.press(0, "shoot");
  for (let t = 0; t < 0.4; t += STEP) m.step(STEP);
  callShootingFoul(m, m.athletes[1]!, m.athletes[0]!, z > 8 ? 3 : 2);
  m.forced = outcome;
  m.release(0, 820 * 0.8);
  for (let t = 0; t < 6 && !(m.phase === "freeThrow" && m.freeThrows?.stage !== "whistle"); t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return { m, events };
}

describe("fouls on a shot", () => {
  it("counts the basket and gives one shot for an and one", () => {
    const { m, events } = fouledShot("swish");
    expect(m.score[0]).toBe(2);
    expect(events.some((e) => e.type === "andOne")).toBe(true);
    expect(m.freeThrows).toMatchObject({ shooter: 0, shots: 1 });
    expect(m.foulCall).toBeNull();
  });

  it("gives two shots for a missed two and three for a missed three", () => {
    expect(fouledShot("rimOut").m.freeThrows?.shots).toBe(2);
    expect(fouledShot("rimOut", 9.3).m.freeThrows?.shots).toBe(3);
  });

  it("is clean for a defender who stays down, and for one who goes straight up on time more than one who lunges late", () => {
    const m = shooting(1);
    expect(rollShootingFoul(m, m.athletes[0]!, "jumper")).toBeNull();
    const rate = (late: boolean) => {
      let fouls = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const s = shooting(seed);
        const d = s.athletes[1]!;
        // Up in the air: at the top of the jump, or on the way down and flying in.
        d.action = { kind: "block", t: late ? 0.6 : 0.4, peak: 0.5, gather: 0.12, air: 0.56 };
        d.y = 0.3;
        if (late) d.vz = 3;
        if (rollShootingFoul(s, s.athletes[0]!, "jumper")) fouls++;
      }
      return fouls / 300;
    };
    expect(rate(true)).toBeGreaterThan(rate(false) * 2);
  });
});
