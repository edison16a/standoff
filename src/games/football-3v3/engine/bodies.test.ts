import { describe, expect, it } from "vitest";
import { createAthlete, gripOf } from "./body";
import { separate } from "./collide";
import { startJuke, updateJuke } from "./juke";
import { moveAthlete } from "./motion";
import { knockDown } from "./down";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { JUKE } from "./tuning";
import type { Athlete } from "./types";

const DT = 1 / 120;

function runner(): Athlete {
  const a = createAthlete(0, 0, "runner", 0, "routerunner", null);
  a.yaw = Math.PI / 2;
  return a;
}

function sprint(a: Athlete, seconds: number, move = { x: 1, z: 0 }): void {
  a.move = move;
  for (let t = 0; t < seconds; t += DT) moveAthlete(a, DT, false, null);
}

describe("running on cleats", () => {
  it("plants and cuts: a hard cut at speed brakes and turns at once, inside the grip", () => {
    const a = runner();
    sprint(a, 3);
    a.move = { x: 0, z: 1 };
    let braked = false;
    for (let t = 0; t < 0.5; t += DT) {
      moveAthlete(a, DT, false, null);
      expect(Math.hypot(a.ax, a.az)).toBeLessThanOrEqual(gripOf(a) + 1e-6);
      if (a.ax < -2 && a.az > 2) braked = true;
    }
    expect(braked).toBe(true);
  });

  it("is shaken after a jolt: less grip and pace for a moment", () => {
    const steady = runner();
    const shaken = runner();
    shaken.stagger = 0.5;
    sprint(steady, 0.4);
    sprint(shaken, 0.4);
    expect(Math.hypot(shaken.vx, shaken.vz)).toBeLessThan(Math.hypot(steady.vx, steady.vz));
  });
});

describe("a juke off the planted foot", () => {
  it("builds the side step's sideways speed over the plant, not in one frame", () => {
    const a = runner();
    sprint(a, 3);
    a.move = { x: 0, z: 1 };
    expect(startJuke(a, () => {})).toBe(true);
    updateJuke(a, 1 / 60);
    const first = a.vz;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(JUKE.hop * 0.5);
    let most = first;
    for (let t = 0; t < JUKE.side.dur; t += 1 / 60) {
      updateJuke(a, 1 / 60);
      most = Math.max(most, a.vz);
    }
    expect(most).toBeGreaterThan(JUKE.hop * 0.8);
    // Then the stride bends back into the run.
    expect(a.vz).toBeLessThan(most);
  });
});

describe("bodies meeting", () => {
  it("shoves a locked pair of linemen back a little when a runner crashes into them, and stops him", () => {
    const m = peopleMatch();
    snap(m);
    const pair = m.lines[1]!;
    const l = m.athletes.find((a) => a.role === "lineman" && a.team === m.defense && a.slot === 1)!;
    const wr = bySeat(m, 1);
    // He hits the defensive lineman square from the defence's side, going hard toward the backfield.
    wr.x = l.x + m.sign * 0.7;
    wr.z = l.z;
    wr.vx = -m.sign * 8;
    wr.vz = 0;
    const v0 = pair.v;
    separate(m, m.bumps);
    expect(-m.sign * (pair.v - v0)).toBeGreaterThan(0.5);
    expect(-m.sign * wr.vx).toBeLessThan(3);
  });

  it("lets a pile of players on the ground settle apart instead of overlapping", () => {
    const m = peopleMatch();
    snap(m);
    const a = bySeat(m, 1);
    const b = bySeat(m, 3);
    knockDown(a, 3, "tackled");
    knockDown(b, 3, "tackler");
    b.x = a.x + 0.1;
    b.z = a.z;
    for (let i = 0; i < 60; i++) separate(m, m.bumps);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.6);
  });

  it("shakes a player's footing when he is run over", () => {
    const m = peopleMatch();
    snap(m);
    const small = bySeat(m, 1);
    const big = bySeat(m, 3);
    big.x = small.x - 0.7;
    big.z = small.z;
    big.vx = 9;
    small.vx = -4;
    run(m, 0);
    separate(m, m.bumps);
    expect(small.stagger).toBeGreaterThan(0);
  });
});
