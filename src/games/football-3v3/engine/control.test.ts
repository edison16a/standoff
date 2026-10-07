import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { buildView } from "./view";
import { seatStatus } from "./status";
import { PEOPLE, run, snap } from "./test-helpers";
import type { Entry } from "./lineup";
import { STEP } from "./tuning";

/** One person at QB for Storm, computer runners everywhere else. */
const ALONE: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: 0 },
  { team: 0, role: "runner", build: "speedster", seat: null },
  { team: 0, role: "runner", build: "routerunner", seat: null },
  { team: 1, role: "qb", build: "scrambler", seat: null },
  { team: 1, role: "runner", build: "lockdown", seat: null },
  { team: 1, role: "runner", build: "powerback", seat: null },
];

/** Training keeps the computer still for exact checks; Easy lets the defence end the play. */
function aloneMatch(level: "training" | "easy" = "training"): Match {
  return new Match({ entries: ALONE, seed: 3, firstOffense: 0, level });
}

/** Aims at a receiver and lets go, then steps until the ball is out. */
function throwTo(m: Match, qbId: number, toId: number): void {
  const qb = m.athlete(qbId)!;
  const to = m.athlete(toId)!;
  m.setAim(qbId, { x: to.x - qb.x, z: to.z - qb.z });
  m.step(STEP);
  m.setAim(qbId, null);
  run(m, 1, () => m.ball.state === "pass");
}

describe("one player control switch", () => {
  it("takes over the computer receiver when the ball leaves the QB's hand", () => {
    const m = aloneMatch();
    snap(m);
    const qb = m.bySeat(0)!;
    const wr = m.athletes.find((a) => a.team === 0 && a.role === "runner")!;
    expect(m.steered(0)).toBe(qb);
    throwTo(m, qb.id, wr.id);
    expect(m.ball.state).toBe("pass");
    expect(m.steered(0)).toBe(wr);
    expect(wr.auto).toBe(false);
    expect(qb.auto).toBe(true);
    // The ring moves with control, and the phone gets the runner's pad.
    const view = buildView(m);
    expect(view.athletes.find((a) => a.id === wr.id)!.seat).toBe(0);
    expect(view.athletes.find((a) => a.id === qb.id)!.seat).toBe(null);
    expect(seatStatus(m, 0)!.athlete).toBe(wr.id);
    expect(seatStatus(m, 0)!.pad).toBe("runner");
    // The phone's stick now steers the receiver.
    m.setMove(wr.id, { x: 0, z: 1 });
    expect(wr.move).toEqual({ x: 0, z: 1 });
  });

  it("hands every phone back its own player when the next play lines up", () => {
    const m = aloneMatch("easy");
    snap(m);
    const qb = m.bySeat(0)!;
    const wr = m.athletes.find((a) => a.team === 0 && a.role === "runner")!;
    throwTo(m, qb.id, wr.id);
    run(m, 60, () => m.phase === "choose" || m.phase === "convert");
    expect(m.steered(0)).toBe(qb);
    expect(qb.auto).toBe(false);
    expect(wr.auto).toBe(true);
    expect(wr.pilot).toBe(null);
  });

  it("takes over the back on a pitch", () => {
    const m = aloneMatch();
    const qb = m.bySeat(0)!;
    m.choose(qb.id, "run");
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    const back = m.athlete(m.play!.back!)!;
    m.press(qb.id, "pass");
    run(m, 1, () => m.ball.state === "pass");
    expect(m.steered(0)).toBe(back);
  });

  it("never takes another person's player", () => {
    const m = new Match({ entries: PEOPLE, seed: 7, firstOffense: 0 });
    snap(m);
    const qb = m.bySeat(0)!;
    const wr = m.bySeat(1)!;
    throwTo(m, qb.id, wr.id);
    expect(m.ball.state).toBe("pass");
    expect(m.steered(0)).toBe(qb);
    expect(m.steered(1)).toBe(wr);
    expect(qb.auto).toBe(false);
  });

  it("lets the computer play the borrowed receiver while the phone is away", () => {
    const m = aloneMatch("easy");
    snap(m);
    const qb = m.bySeat(0)!;
    const wr = m.athletes.find((a) => a.team === 0 && a.role === "runner")!;
    throwTo(m, qb.id, wr.id);
    m.setAuto(qb.id, true);
    expect(wr.auto).toBe(true);
    run(m, 60, () => m.phase === "choose" || m.phase === "convert");
    // Still away at the new play: the computer keeps his own player.
    expect(qb.auto).toBe(true);
    m.setAuto(qb.id, false);
    expect(qb.auto).toBe(false);
    expect(m.steered(0)).toBe(qb);
  });
});
