import { describe, expect, it } from "vitest";
import { chargedHit } from "./attack";
import { PadInput } from "./input";
import { CHARGE_KEYS, MOVESETS } from "./moves";
import { chargedMove } from "./select";
import { fightNow, place, run } from "./test-kit";
import { CHARGE } from "./tuning";
import type { Command } from "./types";

/** Holds Attack 1 toward `x` for `frames` steps, then lets go. */
function holdLight(frames: number, x = 1): (id: number, frame: number) => Command | undefined {
  return (id, frame) => {
    if (id !== 0) return undefined;
    if (frame === 0) return { x, y: 0, light: true, lightHeld: true };
    return frame < frames ? { x, y: 0, lightHeld: true } : { x, y: 0 };
  };
}

describe("tap or hold", () => {
  it("throws the quick move when the button comes up before the charge time", () => {
    const state = fightNow(["samurai", "karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    place(state.fighters[1]!, 8);
    run(state, 6, holdLight(5));
    expect(f.action).toBe("attack");
    expect(f.move).toBe("side");
    expect(f.charged).toBe(0);
  });

  it("winds up a charge once held past the charge time and releases it on let go", () => {
    const state = fightNow(["samurai", "karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    place(state.fighters[1]!, 8);
    const events = run(state, CHARGE.threshold + 3, holdLight(200));
    expect(f.action).toBe("charge");
    expect(f.move).toBe("holdSide");
    expect(events.some((e) => e.type === "charge")).toBe(true);
    run(state, 20, (id) => (id === 0 ? { x: 1, y: 0, lightHeld: true } : undefined));
    run(state, 1, (id) => (id === 0 ? { x: 1, y: 0 } : undefined));
    expect(f.action).toBe("attack");
    expect(f.move).toBe("holdSide");
    expect(f.charged).toBeGreaterThan(0.3);
    expect(f.charged).toBeLessThan(1);
  });

  it("lets go by itself at the cap, fully charged", () => {
    const state = fightNow(["bear", "karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    place(state.fighters[1]!, 8);
    run(state, CHARGE.threshold + CHARGE.cap + 4, holdLight(10_000));
    expect(f.action).toBe("attack");
    expect(f.move).toBe("holdSide");
    expect(f.charged).toBe(1);
  });

  it("never charges the up special, so the recovery always comes out at once", () => {
    expect(chargedMove("heavy", 0, 1)).toBeNull();
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    run(state, 2, (_, frame) => (frame === 0 ? { x: 0, y: 1, heavy: true, heavyHeld: true } : { x: 0, y: 1, heavyHeld: true }));
    expect(f.move).toBe("heavyUp");
  });

  it("picks the charged move from the direction held", () => {
    expect(chargedMove("light", 0, 0)).toBe("holdSide");
    expect(chargedMove("light", -1, 0.3)).toBe("holdSide");
    expect(chargedMove("light", 0.2, 1)).toBe("holdUp");
    expect(chargedMove("light", 0, -1)).toBe("holdDown");
    expect(chargedMove("heavy", 1, 0)).toBe("holdHeavy");
    expect(chargedMove("heavy", 0, -1)).toBe("holdHeavyDown");
  });

  it("loses the charge when hit", () => {
    const state = fightNow(["mage", "bear"]);
    const [f, bear] = state.fighters;
    place(f!, 0, 1);
    place(bear!, 1.2, -1);
    run(state, CHARGE.threshold + 2, holdLight(200, 0));
    expect(f!.action).toBe("charge");
    run(state, 30, (id, frame) => (id === 0 ? { x: 0, y: 0, lightHeld: true } : frame === 0 ? { x: 0, y: 0, light: true } : undefined));
    expect(f!.action).not.toBe("charge");
    expect(f!.hold).toBeNull();
  });

  it("hits harder the longer it charged", () => {
    const base = MOVESETS.bear.holdSide.hitboxes[0]!;
    const full = chargedHit(base, 1);
    expect(full.damage).toBeGreaterThan(base.damage);
    expect(full.base).toBeGreaterThan(base.base);
    expect(chargedHit(base, 0)).toEqual({ damage: base.damage, base: base.base, growth: base.growth, angle: base.angle });
  });

  it("roots every charged release", () => {
    for (const set of Object.values(MOVESETS)) for (const key of CHARGE_KEYS) expect(set[key].root, key).toBe(true);
  });
});

describe("the pad's held buttons", () => {
  it("reports Attack as held until it is let go, and a quick tap as a plain press", () => {
    const pad = new PadInput();
    pad.press("light");
    expect(pad.read(0, 0)).toMatchObject({ light: true, lightHeld: true });
    expect(pad.read(0, 0).lightHeld).toBe(true);
    pad.release("light");
    expect(pad.read(0, 0).lightHeld).toBeUndefined();
    pad.press("heavy");
    pad.release("heavy");
    const tap = pad.read(0, 0);
    expect(tap.heavy).toBe(true);
    expect(tap.heavyHeld).toBeUndefined();
  });
});

describe("moving while attacking", () => {
  it("keeps walking slowly through a light move but not through a rooted one", () => {
    const state = fightNow(["karate", "bear"]);
    const [k, bear] = state.fighters;
    place(k!, -4, 1);
    place(bear!, 4, -1);
    run(state, 1, (id) => (id === 0 ? { x: 0, y: 0, light: true } : id === 1 ? { x: 0, y: 0, heavy: true } : undefined));
    expect(k!.move).toBe("jab");
    expect(bear!.move).toBe("heavy");
    const kx = k!.pos.x;
    const bx = bear!.pos.x;
    run(state, 10, (id) => (id === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }));
    expect(k!.pos.x - kx).toBeGreaterThan(0.3);
    expect(Math.abs(bear!.pos.x - bx)).toBeLessThan(0.01);
  });
});
