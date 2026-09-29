import { describe, expect, it } from "vitest";
import { HELIPAD } from "./chopper";
import { duel } from "./duel";
import { CLEAR_SECONDS, FLY_SPEED, WALK_SPEED } from "./pacing";
import { segment } from "./route";
import { AVERAGE, simulateRun, SLOPPY, STEADY, type Bot, type Hand } from "./sim";
import { CHOPPER_STAGE, STAGE_COUNT, STAGES } from "./stages";
import { WEAPON_IDS, type WeaponId } from "./weapons";

/** Where a run that clears every stage ends up. */
const END = STAGE_COUNT + 1;

const solo = (weapon: WeaponId, hand: Hand): Bot[] => [{ seat: 1, weapon, hand }];
const four = (hand: Hand): Bot[] => WEAPON_IDS.map((weapon, i) => ({ seat: i + 1, weapon, hand }));
const two = (hand: Hand): Bot[] => [
  { seat: 1, weapon: "rifle", hand },
  { seat: 2, weapon: "shotgun", hand },
];

/** Seconds on the way to a stage: a run, or the chopper ride from the helipad. */
function legSeconds(index: number): number {
  const length = segment(index).length;
  return index === CHOPPER_STAGE + 1 ? (length - HELIPAD) / FLY_SPEED : length / WALK_SPEED;
}

/**
 * The difficulty curve, checked with bots standing in for players. A bot
 * aims with a shaky hand through the real guns: their cones, their range
 * and their kick. Speed makes it hard, not numbers, so the checks are on
 * how far a hand gets at each level and how long the fights last.
 */
describe("the difficulty curve", () => {
  it("lets steady aim clear the whole route alone on the default level, with any gun", () => {
    for (const weapon of WEAPON_IDS) expect(simulateRun(solo(weapon, STEADY)).reached, weapon).toBe(END);
  });

  it("lets a steady team of two or four clear it on hard too", () => {
    expect(simulateRun(two(STEADY), { level: "hard" }).reached).toBe(END);
    expect(simulateRun(four(STEADY), { level: "hard" }).reached).toBe(END);
  });

  it("stops sloppy aim before the ship on medium, whatever the gun", () => {
    for (const weapon of WEAPON_IDS) expect(simulateRun(solo(weapon, SLOPPY), { level: "medium" }).reached, weapon).toBeLessThan(END);
  });

  it("stops sloppy aim well short of it on hard", () => {
    for (const weapon of WEAPON_IDS) expect(simulateRun(solo(weapon, SLOPPY), { level: "hard" }).reached, weapon).toBeLessThanOrEqual(12);
  });

  it("costs more health on hard than on easy for the same hand", () => {
    const lost = (level: "easy" | "hard") => simulateRun(solo("rifle", AVERAGE), { level }).results.reduce((sum, r) => sum + r.healthLost, 0);
    expect(lost("hard")).toBeGreaterThan(lost("easy"));
  });

  it("keeps the run brisk: short walks, short stops and short fights", () => {
    for (const s of STAGES) expect(legSeconds(s.index), s.title).toBeLessThan(8);
    expect(CLEAR_SECONDS).toBeLessThanOrEqual(2);
    for (const bots of [solo("rifle", STEADY), four(AVERAGE)]) {
      const seconds = simulateRun(bots).results.map((r) => r.seconds);
      expect(seconds.reduce((a, b) => a + b, 0) / seconds.length).toBeLessThan(20);
      expect(Math.max(...seconds)).toBeLessThan(35);
    }
  });
});

/** Seconds for each gun to drop a line of zombies at one range, over a few tries. */
function race(kind: Parameters<typeof duel>[1], metres: number, hand: Hand, count = 6): Record<WeaponId, number> {
  const out = {} as Record<WeaponId, number>;
  for (const w of WEAPON_IDS) {
    let sum = 0;
    for (let seed = 1; seed <= 4; seed++) sum += duel(w, kind, metres, hand, count, seed).seconds;
    out[w] = sum / 4;
  }
  return out;
}

const fastest = (times: Record<WeaponId, number>) => WEAPON_IDS.reduce((a, b) => (times[b] < times[a] ? b : a));

/** Each gun is the pick for some player or some fight. */
describe("the guns", () => {
  it("makes the shotgun the fastest on a boss up close, and hopeless far off", () => {
    expect(fastest(race("butcher", 5, AVERAGE, 1))).toBe("shotgun");
    expect(fastest(race("tank", 6, AVERAGE, 1))).toBe("shotgun");
    const far = race("walker", 25, STEADY);
    expect(far.shotgun).toBeGreaterThan(far.rifle * 3);
  });

  it("makes the rifle the fastest far off", () => {
    expect(fastest(race("walker", 25, STEADY))).toBe("rifle");
    expect(fastest(race("brute", 15, STEADY))).toBe("rifle");
  });

  it("lets the AK cut riot zombies down fastest, if it is fired in bursts", () => {
    expect(fastest(race("armored", 12, AVERAGE))).toBe("ak47");
    const tapped = duel("ak47", "walker", 15, STEADY, 12);
    const held = duel("ak47", "walker", 15, { ...STEADY, patience: Infinity }, 12);
    expect(held.shots).toBeGreaterThan(tapped.shots * 2);
  });

  it("carries an average hand through hard with the submachine gun, where the AK falls short", () => {
    expect(simulateRun(solo("smg", AVERAGE), { level: "hard" }).reached).toBe(END);
    expect(simulateRun(solo("ak47", AVERAGE), { level: "hard" }).reached).toBeLessThan(END);
  });

  it("forgives a sloppy hand best with the shotgun", () => {
    const reached = WEAPON_IDS.map((w) => simulateRun(solo(w, SLOPPY), { level: "medium" }).reached);
    expect(Math.max(...reached)).toBe(reached[WEAPON_IDS.indexOf("shotgun")]);
  });
});
