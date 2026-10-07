import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { callFoul } from "./foul-call";
import { Match, type Entry } from "./match";
import { GREEN_MS } from "./shot-model";
import { SHOT, STEP } from "./tuning";

/** Player 0 is on a phone; everyone else is a computer. */
const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** Player 0 fouled and set at the line with the ball. */
function atTheLine(): { m: Match; events: MatchEvent[] } {
  const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  const a = m.athletes[0]!;
  a.action = { kind: "none" };
  m.ball.holder = 0;
  m.ball.mode = "held";
  callFoul(m, m.athletes[1]!, a);
  const events: MatchEvent[] = [];
  for (let t = 0; t < 12 && !events.some((e) => e.type === "freeThrow"); t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
  return { m, events };
}

function hold(m: Match, events: MatchEvent[], seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    events.push(...m.drainEvents());
  }
}

describe("holding Shoot at the free throw line", () => {
  it("waits for the thumb however long it is held, well past the jumper's limit", () => {
    const { m, events } = atTheLine();
    m.press(0, "shoot");
    hold(m, events, ((SHOT.meterMs * SHOT.autoReleaseAt) / 1000) * 2);
    const act = m.athletes[0]!.action;
    expect(act.kind === "shoot" && act.released).toBe(false);
    expect(events.some((e) => e.type === "shot")).toBe(false);
    m.release(0, (act.kind === "shoot" ? act.t : 0) * 1000);
    const shot = m.drainEvents().find((e) => e.type === "shot");
    expect(shot?.type === "shot" && shot.grade).toBe("late");
  });

  it("lets go on the green whenever the player lets go there", () => {
    const { m, events } = atTheLine();
    m.press(0, "shoot");
    hold(m, events, GREEN_MS / 1000);
    m.release(0, GREEN_MS);
    const shot = m.drainEvents().find((e) => e.type === "shot");
    expect(shot?.type === "shot" && (shot.grade === "perfect" || shot.grade === "gold")).toBe(true);
  });

  it("still throws a jumper that is held too long, since the shooter is in the air", () => {
    const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    const a = m.athletes[0]!;
    Object.assign(a, { x: 0, z: 7, vx: 0, vz: 0, action: { kind: "none" } });
    m.ball.holder = 0;
    m.ball.mode = "held";
    m.needsClear = false;
    for (const o of m.athletes) if (o !== a) Object.assign(o, { x: o.x + 20 });
    m.press(0, "shoot");
    const events: MatchEvent[] = [];
    hold(m, events, (SHOT.meterMs * SHOT.autoReleaseAt) / 1000 + 0.05);
    expect(events.some((e) => e.type === "shot")).toBe(true);
  });
});
