import { describe, expect, it } from "vitest";
import { CENTER } from "@/games/kit/pad/stick-math";
import type { Entry } from "../engine/match";
import { STEP } from "../engine/tuning";
import { ControlSwitch } from "./control-switch";
import { MatchDriver } from "./match-driver";

/** Seat 1 plays the Shooter with two computer teammates, unless `mate` puts seat 3 on the Dunker. */
function entries(mate = false): Entry[] {
  return [
    { team: 0, build: "shooter", seat: 1 },
    { team: 0, build: "dunker", seat: mate ? 3 : null },
    { team: 0, build: "playmaker", seat: null },
    { team: 1, build: "lockdown", seat: 2 },
    { team: 1, build: "allround", seat: null },
    { team: 1, build: "big", seat: null },
  ];
}

/** A live game with the ball in `holder`'s hands and the defence far away. */
function live(mate = false, holder = 0): MatchDriver {
  const d = new MatchDriver(entries(mate), 3);
  const m = d.match;
  while (m.phase !== "live") m.step(STEP);
  for (const a of m.athletes) a.action = { kind: "none" };
  m.ball.holder = holder;
  m.ball.mode = "held";
  m.needsClear = false;
  m.offence = 0;
  for (const a of m.athletes) if (a.team === 1) Object.assign(a, { x: a.x + 14 });
  return d;
}

/** Passes from whatever `seat` moves to the teammate at `to`, then plays on until it is caught. */
function passTo(d: MatchDriver, seat: number, to: number): void {
  const m = d.match;
  d.press(seat, "pass", CENTER);
  d.release(seat);
  for (let t = 0; t < 3 && m.ball.holder !== to; t += STEP) d.tick(STEP, () => CENTER);
  expect(m.ball.holder).toBe(to);
}

describe("switching control on a pass", () => {
  it("hands the passer's phone to the computer teammate who caught it", () => {
    const d = live();
    // Only the Dunker is open, so the pass goes to him.
    d.match.athletes[2]!.x += 14;
    passTo(d, 1, 1);
    expect(d.athleteBySeat.get(1)).toBe(1);
    expect(d.match.athletes[1]!.auto).toBe(false);
    expect(d.match.athletes[0]!.auto).toBe(true);
    expect(d.pilotOf(1)).toBe(1);
    expect(d.pilotOf(0)).toBeNull();
    // The name and the box score stay with the player the phone started as.
    expect(d.ownerOf(1)).toBe(0);
  });

  it("never takes over another person's player", () => {
    const d = live(true);
    d.match.athletes[2]!.x += 14;
    passTo(d, 1, 1);
    expect(d.athleteBySeat.get(1)).toBe(0);
    expect(d.athleteBySeat.get(3)).toBe(1);
    expect(d.match.athletes[0]!.auto).toBe(false);
  });
});

describe("switching control to the ball", () => {
  it("moves the lone person on a team to the computer teammate who stole it", () => {
    const d = live();
    const s = new ControlSwitch().onEvent({ type: "steal", id: 2, victim: 4 }, d.match, d.athleteBySeat);
    expect(s).toEqual({ seat: 1, to: 2 });
  });

  it("leaves two friends on one team where they are", () => {
    const d = live(true);
    expect(new ControlSwitch().onEvent({ type: "rebound", id: 2, offensive: true }, d.match, d.athleteBySeat)).toBeNull();
  });

  it("does nothing when the person won it himself, and switches the other side's lone person to theirs", () => {
    const d = live();
    const sw = new ControlSwitch();
    expect(sw.onEvent({ type: "rebound", id: 0, offensive: true }, d.match, d.athleteBySeat)).toBeNull();
    expect(sw.onEvent({ type: "steal", id: 4, victim: 0 }, d.match, d.athleteBySeat)?.seat).toBe(2);
  });
});
