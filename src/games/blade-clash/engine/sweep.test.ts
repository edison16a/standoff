import { describe, expect, it } from "vitest";
import { hurtboxes } from "./body";
import { lerpVec, type Segment } from "./geometry";
import { sweep, type Combatant, type SweepRules } from "./sweep";

const TICK = 1 / 60;
const rules: SweepRules = { dt: TICK, hitSpeed: 3, clashSpeed: 1.5, canClash: true };

/** A blade moving from one segment to another over the tick, held by a fighter standing at `x`. */
function mover(from: Segment, to: Segment, x: number, extra: Partial<Combatant> = {}): Combatant {
  return {
    at: (t) => ({ blade: { a: lerpVec(from.a, to.a, t), b: lerpVec(from.b, to.b, t) }, body: hurtboxes(x) }),
    radius: 0.03,
    canHit: true,
    canBeHit: true,
    ...extra,
  };
}

const still = (blade: Segment, x: number, extra: Partial<Combatant> = {}) => mover(blade, blade, x, extra);
const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): Segment => ({
  a: { x: ax, y: ay, z: az },
  b: { x: bx, y: by, z: bz },
});

/** A horizontal cut at chest height, the blade reaching past x = 1, from the fighter's right to their left. */
const cutFrom = seg(-0.3, 1.25, 0.2, 0.6, 1.25, 1.1);
const cutTo = seg(-0.3, 1.25, -0.2, 0.6, 1.25, -1.1);
const parkedBlade = seg(1.4, 1.2, 0.2, 2.2, 1.6, 0.3);

describe("sweep", () => {
  it("catches a cut so fast it is on either side of the body in the two frames", () => {
    // Neither end pose touches the target at x = 0.7, only the path between them does.
    const cut = mover(cutFrom, cutTo, -1.2);
    expect(cut.at(0).blade.b.z).toBeGreaterThan(0.5);
    const contacts = sweep([cut, still(parkedBlade, 0.7)], rules);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ kind: "hit", attacker: 0, part: "torso" });
    expect(contacts[0]!.speed).toBeGreaterThan(30);
  });

  it("does not count the same path taken slowly", () => {
    const contacts = sweep([mover(cutFrom, cutTo, -1.2), still(parkedBlade, 0.7)], { ...rules, dt: 2 });
    expect(contacts).toEqual([]);
  });

  it("does not count a blade resting on the body", () => {
    const resting = seg(-0.3, 1.25, 0, 0.9, 1.3, 0);
    expect(sweep([still(resting, -1.2), still(parkedBlade, 0.7)], rules)).toEqual([]);
  });

  it("needs the attacker free and the target open", () => {
    expect(sweep([mover(cutFrom, cutTo, -1.2, { canHit: false }), still(parkedBlade, 0.7)], rules)).toEqual([]);
    expect(sweep([mover(cutFrom, cutTo, -1.2), still(parkedBlade, 0.7, { canBeHit: false })], rules)).toEqual([]);
  });

  it("stops a cut on a blade held in its way, before it reaches the body", () => {
    // The defender holds their blade upright in front of their chest, across the cut's path.
    const block = seg(0.35, 0.9, 0.35, 0.35, 1.8, 0.35);
    const contacts = sweep([mover(cutFrom, cutTo, -1.2), still(block, 0.7)], rules);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ kind: "clash" });
    const clash = contacts[0]!;
    if (clash.kind !== "clash") throw new Error("expected a clash");
    expect(clash.at.z).toBeCloseTo(0.35, 1);
    expect(clash.speed).toBeGreaterThan(rules.clashSpeed);
  });

  it("lets the cut through when clashes are cooling down", () => {
    const block = seg(0.35, 0.9, 0.35, 0.35, 1.8, 0.35);
    const contacts = sweep([mover(cutFrom, cutTo, -1.2), still(block, 0.7)], { ...rules, canClash: false });
    expect(contacts[0]).toMatchObject({ kind: "hit", attacker: 0 });
  });

  it("lets blades that only rest together pass without a clash", () => {
    const a = seg(0, 1.3, 0, 1, 1.3, 0);
    const b = seg(0.5, 1, 0, 0.5, 1.6, 0);
    expect(sweep([still(a, -1.2), still(b, 1.8)], rules)).toEqual([]);
  });

  it("reports both hits when both fighters land in the same instant", () => {
    const mirror = (segment: Segment): Segment => ({ a: { ...segment.a, x: -segment.a.x }, b: { ...segment.b, x: -segment.b.x } });
    // Two identical cuts from either side. With clashes cooling down the blades pass each other.
    const one = mover(cutFrom, cutTo, -1.1);
    const two = mover(mirror(cutFrom), mirror(cutTo), 1.1);
    const both = sweep([mover(cutFrom, cutTo, -0.7), mover(mirror(cutFrom), mirror(cutTo), 0.7)], { ...rules, canClash: false });
    expect(both.map((c) => c.kind === "hit" && c.attacker).sort()).toEqual([0, 1]);
    expect(sweep([one, two], { ...rules, canClash: false })).toEqual([]);
  });
});
