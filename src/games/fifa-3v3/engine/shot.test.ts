import { describe, expect, it } from "vitest";
import { newBall, stepBall, type Contact } from "./ball";
import { outAt, scoredIn } from "./goal";
import { Rng } from "./rng";
import { aimPoint, fly, solveKick } from "./shot-aim";
import { OUTCOMES, pickOutcome, shotOdds, type ShotContext } from "./shot-odds";
import { BALL, STEP } from "./tuning";
import type { Keeper, ShotOutcome } from "./types";

const typical: ShotContext = { distance: 11, angle: 0.3, shooting: 0.85, pressure: 0.3, keeperOff: 0, power: 0.4, beaten: false };

function keeperAt(x: number, z: number): Keeper {
  return { team: 1, pos: { x, z }, vel: { x: 0, z: 0 }, facing: Math.PI, action: "set", actionT: 0, dive: null, holdFor: 0, noTouch: 0, saves: 0 };
}

/** Strikes a ball from `from` with the outcome's aim and plays it out with full physics. */
function playOut(outcome: ShotOutcome, seed: number, from = { x: 5, y: BALL.radius, z: 2 }) {
  const rng = new Rng(seed);
  const keeper = keeperAt(14.8, 0.4);
  const target = aimPoint(outcome, 1, keeper, rng);
  const kick = solveKick(from, target, 24, rng.range(-8, 8));
  const ball = newBall();
  ball.pos = { ...from };
  ball.vel = { ...kick.vel };
  ball.spin = { ...kick.spin };
  const contacts: Contact[] = [];
  let scored = false;
  let out = false;
  for (let t = 0; t < 3; t += STEP) {
    stepBall(ball, STEP, contacts);
    if (scoredIn(ball) === 1) scored = true;
    if (outAt(ball) !== null) out = true;
    if (scored || out) break;
  }
  return { scored, out, contacts, target, kick };
}

describe("the shot odds", () => {
  it("add up to one", () => {
    const odds = shotOdds(typical);
    const sum = OUTCOMES.reduce((total, outcome) => total + odds[outcome], 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("send about one shot in twenty off the woodwork and one in twenty over", () => {
    const odds = shotOdds(typical);
    expect(odds.post + odds.bar).toBeGreaterThan(0.035);
    expect(odds.post + odds.bar).toBeLessThan(0.07);
    expect(odds.over).toBeGreaterThan(0.03);
    expect(odds.over).toBeLessThan(0.09);
  });

  it("make close shots better than long ones, and pressure hurts", () => {
    const close = shotOdds({ ...typical, distance: 5, angle: 0 });
    const far = shotOdds({ ...typical, distance: 20 });
    const pressed = shotOdds({ ...typical, pressure: 1 });
    expect(close.goal).toBeGreaterThan(0.55);
    expect(far.goal).toBeLessThan(0.3);
    expect(pressed.goal).toBeLessThan(shotOdds(typical).goal);
  });

  it("always scores once the keeper is beaten, bar the woodwork and misses", () => {
    const odds = shotOdds({ ...typical, beaten: true });
    expect(odds.catch + odds.parry).toBe(0);
  });

  it("picks every outcome across the range of rolls", () => {
    const odds = shotOdds(typical);
    const seen = new Set<ShotOutcome>();
    for (let roll = 0; roll < 1; roll += 0.001) seen.add(pickOutcome(odds, roll));
    expect([...seen].sort()).toEqual([...OUTCOMES].sort());
  });
});

describe("the shot's flight", () => {
  it("passes through the chosen point", () => {
    const from = { x: 3, y: BALL.radius, z: -4 };
    const target = { x: 16, y: 1.2, z: 1.5 };
    const kick = solveKick(from, target, 26, 9);
    const hit = fly(from, kick, target.x);
    expect(hit).not.toBeNull();
    expect(Math.abs(hit!.z - target.z)).toBeLessThan(0.03);
    expect(Math.abs(hit!.y - target.y)).toBeLessThan(0.03);
  });

  it("scores when the dice say goal", () => {
    for (let seed = 1; seed <= 20; seed++) expect(playOut("goal", seed).scored).toBe(true);
  });

  it("rings the post and stays out when the dice say post", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const shot = playOut("post", seed);
      expect(shot.contacts.some((c) => c.type === "post")).toBe(true);
      expect(shot.scored).toBe(false);
    }
  });

  it("clips the bar and stays out when the dice say bar", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const shot = playOut("bar", seed);
      expect(shot.contacts.some((c) => c.type === "bar")).toBe(true);
      expect(shot.scored).toBe(false);
    }
  });

  it("flies over and out when the dice say over", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const shot = playOut("over", seed);
      expect(shot.scored).toBe(false);
      expect(shot.out).toBe(true);
    }
  });

  it("misses the goal when the dice say wide", () => {
    for (let seed = 1; seed <= 20; seed++) expect(playOut("wide", seed).scored).toBe(false);
  });
});
