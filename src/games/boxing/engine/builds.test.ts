import { describe, expect, it } from "vitest";
import { BUILDS, buildById, type BuildId } from "./builds";
import { PUNCHES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";
import { NO_DEFENSE } from "./types";

/** A match with red on `red` and blue on `blue`, already fighting. */
function match(red: BuildId, blue: BuildId = "counter-puncher") {
  return fighting({ builds: [red, blue] });
}

/** Damage of one clean jab to an open, still head. */
function jabDamage(build: BuildId): number {
  const m = match(build);
  m.setInput(1, { ...NO_DEFENSE });
  m.throwPunch(0, "left", "jab", 1);
  return ofType(run(m, 400), "hit")[0]!.damage;
}

describe("builds", () => {
  it("have bars that rank the same way as what they do", () => {
    const rank = (key: (b: (typeof BUILDS)[number]) => number) => [...BUILDS].sort((a, b) => key(a) - key(b)).map((b) => b.id);
    const same = (bars: (b: (typeof BUILDS)[number]) => number, effect: (b: (typeof BUILDS)[number]) => number) => {
      for (const a of BUILDS) for (const b of BUILDS) if (bars(a) > bars(b)) expect(effect(a)).toBeGreaterThan(effect(b));
    };
    same((b) => b.stats.power, (b) => b.effects.damage);
    same((b) => b.stats.speed, (b) => 1 / b.effects.handSpeed);
    same((b) => b.stats.reach, (b) => b.effects.reach);
    same((b) => b.stats.defense, (b) => b.effects.guard * b.effects.counterWindow);
    same((b) => b.stats.stamina, (b) => b.effects.staminaRegen / b.effects.staminaCost);
    expect(rank((b) => b.stats.power).at(-1)).toBe("slugger");
    for (const build of BUILDS) for (const bar of Object.values(build.stats)) expect(bar).toBeGreaterThanOrEqual(1);
  });

  it("a slugger hits harder than an out boxer", () => {
    expect(jabDamage("slugger")).toBeGreaterThan(jabDamage("out-boxer") * 1.35);
  });

  it("an out boxer's hands land sooner", () => {
    const quick = match("out-boxer");
    const slow = match("slugger");
    quick.throwPunch(0, "right", "cross", 1);
    slow.throwPunch(0, "right", "cross", 1);
    expect(quick.fighters[0].punch!.impactAt - quick.now).toBeLessThan(PUNCHES.cross.travelMs);
    expect(slow.fighters[0].punch!.impactAt - slow.now).toBeGreaterThan(PUNCHES.cross.travelMs);
  });

  it("an out boxer's long arms catch a slip that beats a swarmer", () => {
    const tried = (build: BuildId) => {
      const m = match(build);
      m.throwPunch(0, "right", "cross", 1, 300);
      run(m, 320);
      m.setInput(1, { ...NO_DEFENSE, head: { x: 0.17, y: 0 } });
      return ofType(run(m, 300), "hit").length;
    };
    expect(tried("out-boxer")).toBe(1);
    expect(tried("swarmer")).toBe(0);
  });

  it("a counter puncher's guard stops more and their counter window stays open longer", () => {
    const leaky = (defender: BuildId) => {
      const m = fighting({ builds: ["slugger", defender] });
      hold(m, 1, { shell: "guard" });
      const input = m.fighters[1].input;
      // A guard that only half covers the face.
      m.setInput(1, { ...input, cover: { left: { ...input.cover.left, face: 0.4 }, right: { ...input.cover.right, face: 0.4 } } });
      m.throwPunch(0, "left", "jab", 1);
      return ofType(run(m, 400), "hit")[0]?.damage ?? 0;
    };
    expect(leaky("counter-puncher")).toBeLessThan(leaky("swarmer"));
    expect(buildById("counter-puncher")!.effects.counterWindow).toBeGreaterThan(1.4);
    const m = fighting({ builds: ["slugger", "counter-puncher"] });
    hold(m, 1, { shell: "guard" });
    m.throwPunch(0, "left", "jab", 1);
    run(m, PUNCHES.jab.travelMs + 30);
    expect(m.fighters[1].counterUntil - m.now).toBeGreaterThan(1200);
  });

  it("a swarmer can keep punching long after a slugger runs dry", () => {
    const left = (build: BuildId) => {
      const m = match(build);
      for (let i = 0; i < 12; i++) {
        m.throwPunch(0, i % 2 ? "right" : "left", i % 2 ? "cross" : "jab", 1);
        run(m, 500);
      }
      return m.fighters[0].stamina;
    };
    expect(left("swarmer")).toBeGreaterThan(left("slugger") + 15);
  });
});
