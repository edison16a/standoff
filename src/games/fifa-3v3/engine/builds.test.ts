import { describe, expect, it } from "vitest";
import { ATTRIBUTE_IDS, ATTRIBUTE_PAIRS, type AttributeId } from "../attributes";
import { BUILD_IDS, BUILDS, computerName, type BuildId } from "../builds";
import { makeAthlete, topSpeed } from "./athlete";
import { blockLane, blockSharpness, foulRisk, heavyTouch, leadShare, passError, passRange, passZip, recovery, stealReach, strikePace, tackleEdge, takeRange } from "./build-effects";
import { shotOdds, type ShotContext } from "./shot-odds";

const player = (build: BuildId) => makeAthlete(0, 0, 0, build, null);
const sum = (build: BuildId) => ATTRIBUTE_IDS.reduce((total, id) => total + BUILDS[build].ratings[id], 0);

describe("the builds", () => {
  it("are six, each with its own number and every rating from 0 to 99", () => {
    expect(BUILD_IDS).toHaveLength(6);
    expect(new Set(BUILD_IDS.map((id) => BUILDS[id].number)).size).toBe(6);
    for (const id of BUILD_IDS) for (const a of ATTRIBUTE_IDS) expect(BUILDS[id].ratings[a]).toBeGreaterThanOrEqual(0);
    for (const id of BUILD_IDS) for (const a of ATTRIBUTE_IDS) expect(BUILDS[id].ratings[a]).toBeLessThanOrEqual(99);
  });

  it("each specialist is best at its own pair, and its pair is its two highest ratings", () => {
    const owner: Record<string, BuildId> = { finishing: "striker", passing: "playmaker", pace: "winger", tackling: "defender", reach: "keeper" };
    for (const [a, b] of ATTRIBUTE_PAIRS) {
      const id = owner[a]!;
      expect(BUILDS[id].key).toEqual([a, b]);
      for (const attr of [a, b]) for (const other of BUILD_IDS) if (other !== id) expect(BUILDS[id].ratings[attr]).toBeGreaterThan(BUILDS[other].ratings[attr]);
      const sorted = [...ATTRIBUTE_IDS].sort((x, y) => BUILDS[id].ratings[y] - BUILDS[id].ratings[x]);
      expect(new Set(sorted.slice(0, 2))).toEqual(new Set<AttributeId>([a, b]));
    }
  });

  it("are balanced: every build has about the same in total", () => {
    const totals = BUILD_IDS.map(sum);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(25);
  });

  it("gives the all rounder no weak spot and no standout", () => {
    const r = BUILDS.allrounder.ratings;
    for (const a of ATTRIBUTE_IDS) expect(r[a]).toBeGreaterThanOrEqual(70);
    for (const a of ATTRIBUTE_IDS) expect(r[a]).toBeLessThan(85);
  });

  it("names computer players by their build", () => {
    expect(computerName("winger")).toBe("CPU Winger");
  });
});

describe("what the ratings do", () => {
  it("pace: the winger runs fastest and the sweeper keeper slowest", () => {
    const speeds = BUILD_IDS.map((id) => topSpeed(player(id)));
    expect(Math.max(...speeds)).toBe(topSpeed(player("winger")));
    expect(Math.min(...speeds)).toBe(topSpeed(player("keeper")));
  });

  it("finishing and shot power: the striker's full strike beats the keeper more often", () => {
    const shot = (id: BuildId): ShotContext => {
      const a = player(id);
      return { distance: 13, angle: 0.2, shooting: a.attrs.finishing, strike: a.attrs.power, pressure: 0, keeperOff: 0, power: 0.9, beaten: false };
    };
    expect(shotOdds(shot("striker")).goal).toBeGreaterThan(shotOdds(shot("playmaker")).goal * 1.1);
    expect(strikePace(player("striker"))).toBeGreaterThan(strikePace(player("playmaker")));
  });

  it("passing and vision: the playmaker's passes land closest, arrive firmest and lead runs best", () => {
    const pm = player("playmaker");
    for (const id of BUILD_IDS.filter((b) => b !== "playmaker")) {
      expect(passError(pm)).toBeLessThan(passError(player(id)));
      expect(passZip(pm)).toBeGreaterThan(passZip(player(id)));
      expect(leadShare(pm)).toBeGreaterThan(leadShare(player(id)));
      expect(passRange(pm)).toBeGreaterThan(passRange(player(id)));
    }
    // Over a 20 metre pass the gap is real: a few centimetres against half a metre.
    expect(passError(pm) * 20).toBeLessThan(0.1);
    expect(passError(player("keeper")) * 20).toBeGreaterThan(0.5);
  });

  it("tackling and strength: the defender wins the ball more and fouls less", () => {
    const winger = player("winger");
    expect(tackleEdge(player("defender"), winger)).toBeGreaterThan(tackleEdge(player("striker"), winger) + 0.15);
    expect(foulRisk(player("defender"))).toBeLessThan(foulRisk(player("striker")));
  });

  it("reach and reflexes: the sweeper keeper blocks, pokes and takes the ball from furthest", () => {
    const k = player("keeper");
    for (const id of BUILD_IDS.filter((b) => b !== "keeper")) {
      const o = player(id);
      expect(blockLane(k) * blockSharpness(k)).toBeGreaterThan(blockLane(o) * blockSharpness(o));
      expect(stealReach(k)).toBeGreaterThan(stealReach(o));
      expect(recovery(k)).toBeLessThan(recovery(o));
    }
    expect(takeRange(k)).toBeGreaterThan(takeRange(player("defender")));
    expect(heavyTouch(k)).toBeLessThan(heavyTouch(player("defender")));
  });
});
