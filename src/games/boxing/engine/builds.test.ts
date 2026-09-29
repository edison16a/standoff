import { describe, expect, it } from "vitest";
import { BUILD_LIST, BUILDS, modsFor, type BuildId } from "./builds";
import { Fighter, type ActivePunch } from "./fighter";
import { judge } from "./resolve";
import { fighting, hold, ofType, run } from "./test-helpers";
import { NO_DEFENSE, copyDefense } from "./types";

/** One clean jab from boxer 0 into a still, open boxer 1. */
function jabWith(build: BuildId) {
  const match = fighting({ builds: [build, "counter-puncher"] });
  hold(match, 1, {});
  expect(match.throwPunch(0, "left", "jab", 1)).toBe(true);
  const punch = match.fighters[0].punch!;
  const events = run(match, 800);
  return { travel: punch.impactAt - punch.start, hit: ofType(events, "hit")[0], stamina: match.fighters[0].stamina };
}

function punch(overrides: Partial<ActivePunch> = {}): ActivePunch {
  return { hand: "left", style: "jab", level: "head", power: 1, start: 0, launchAt: 0, impactAt: 0, endAt: 100, aim: { x: 0, y: 0 }, counter: false, tired: false, resolved: false, ...overrides };
}

describe("builds", () => {
  it("has four builds with bars from 1 to 5 and a line each", () => {
    expect(BUILD_LIST.map((b) => b.name)).toEqual(["Slugger", "Out Boxer", "Counter Puncher", "Swarmer"]);
    for (const build of BUILD_LIST) {
      for (const bar of Object.values(build.bars)) expect(bar).toBeGreaterThanOrEqual(1);
      for (const bar of Object.values(build.bars)) expect(bar).toBeLessThanOrEqual(5);
      expect(build.blurb.length).toBeGreaterThan(10);
    }
  });

  it("makes the slugger hit hardest and the out boxer lightest", () => {
    const slugger = jabWith("slugger").hit!;
    const outBoxer = jabWith("out-boxer").hit!;
    const even = jabWith("counter-puncher").hit!;
    expect(slugger.damage).toBeGreaterThan(even.damage * 1.2);
    expect(outBoxer.damage).toBeLessThan(even.damage);
  });

  it("gets the out boxer's punches there first and the slugger's last", () => {
    expect(jabWith("out-boxer").travel).toBeLessThan(jabWith("swarmer").travel);
    expect(jabWith("swarmer").travel).toBeLessThan(jabWith("counter-puncher").travel);
    expect(jabWith("counter-puncher").travel).toBeLessThan(jabWith("slugger").travel);
  });

  it("lets the swarmer throw for less stamina", () => {
    expect(jabWith("swarmer").stamina).toBeGreaterThan(jabWith("slugger").stamina);
  });

  it("gives the swarmer its stamina back fastest", () => {
    const swarmer = new Fighter(0, modsFor("swarmer"));
    const slugger = new Fighter(1, modsFor("slugger"));
    swarmer.stamina = slugger.stamina = 20;
    swarmer.recover(0, 1000);
    slugger.recover(0, 1000);
    expect(swarmer.stamina - 20).toBeGreaterThan((slugger.stamina - 20) * 1.3);
  });

  it("turns a leaky guard into a block for the counter puncher", () => {
    const attacker = new Fighter(0);
    const defender = (id: BuildId) => {
      const f = new Fighter(1, BUILDS[id].mods);
      const input = copyDefense(NO_DEFENSE);
      input.cover.left.face = input.cover.right.face = 0.66;
      f.setInput(input);
      return f;
    };
    expect(judge(punch(), attacker, defender("slugger"), 0).kind).toBe("hit");
    expect(judge(punch(), attacker, defender("counter-puncher"), 0).kind).toBe("block");
  });

  it("keeps the counter puncher's counter chance open longer, and makes it hurt more", () => {
    const counterWindow = (build: BuildId) => {
      const match = fighting({ builds: ["slugger", build] });
      hold(match, 1, { shell: "guard" });
      match.throwPunch(0, "left", "jab", 1);
      run(match, 400);
      return match.fighters[1].counterUntil - match.now;
    };
    expect(counterWindow("counter-puncher")).toBeGreaterThan(counterWindow("slugger") * 1.4);
    const counter = (id: BuildId) => judge(punch({ counter: true, style: "cross", hand: "right" }), new Fighter(0, BUILDS[id].mods), new Fighter(1), 0);
    const a = counter("counter-puncher");
    const b = counter("swarmer");
    expect(a.kind === "hit" && b.kind === "hit" && a.damage > b.damage).toBe(true);
  });

  it("lets the out boxer reach from further and find a slipping head", () => {
    expect(BUILDS["out-boxer"].mods.reach).toBeGreaterThan(BUILDS.swarmer.mods.reach);
    const slipped = { x: 0.13, y: 0 };
    const defender = new Fighter(1);
    defender.setInput({ ...copyDefense(NO_DEFENSE), head: slipped });
    expect(judge(punch(), new Fighter(0, modsFor("swarmer")), defender, 0).kind).toBe("hit");
    const far = { x: 0.2, y: 0 };
    defender.setInput({ ...copyDefense(NO_DEFENSE), head: far });
    expect(judge(punch(), new Fighter(0, modsFor("swarmer")), defender, 0).kind).toBe("miss");
    expect(judge(punch(), new Fighter(0, modsFor("out-boxer")), defender, 0).kind).toBe("hit");
  });

  it("boxes in the middle of the road for an unknown build", () => {
    expect(modsFor("nobody")).toEqual(modsFor(undefined));
    expect(modsFor(undefined).damage).toBe(1);
  });
});
