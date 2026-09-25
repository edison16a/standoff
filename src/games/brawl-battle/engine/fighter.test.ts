import { describe, expect, it } from "vitest";
import { MOVESETS } from "./moves";
import { fightNow, hang, once, place, run } from "./test-kit";

describe("the fighter's state machine", () => {
  it("turns up and Attack pressed together into an up attack, not a jump", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    const events = run(state, 2, once(0, 0, { x: 0, y: 1, jump: true, light: true }));
    expect(f.move).toBe("up");
    expect(events.some((e) => e.type === "jump")).toBe(false);
  });

  it("still turns a jump into an up attack when Attack comes during the crouch", () => {
    const state = fightNow(["samurai"]);
    const f = state.fighters[0]!;
    place(f, 0);
    run(state, 3, (_, frame) => (frame === 0 ? { x: 0, y: 1, jump: true } : frame === 1 ? { x: 0, y: 1, light: true } : { x: 0, y: 1 }));
    expect(f.move).toBe("up");
    expect(f.ground).toBe(0);
  });

  it("uses the aerial in the air and gives it landing lag if it lands early", () => {
    const state = fightNow(["bear"]);
    const f = state.fighters[0]!;
    hang(f, 0, 0.6);
    run(state, 1, once(0, 0, { x: 0, y: 0, light: true }));
    expect(f.move).toBe("air");
    for (let i = 0; i < 30 && f.ground === null; i++) run(state, 1);
    expect(f.action).toBe("land");
    expect(f.lag).toBeGreaterThan(0);
    expect(f.lag).toBeLessThanOrEqual(MOVESETS.bear.air.landLag!);
  });

  it("remembers a press made during a move and throws it when the move ends", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    const frames = MOVESETS.karate.jab.frames;
    run(state, frames + 2, (_, frame) => (frame === 0 ? { x: 0, y: 0, light: true } : frame === frames - 3 ? { x: 1, y: 0, light: true } : undefined));
    expect(f.move).toBe("side");
    expect(f.swing).toBe(2);
  });

  it("allows the up recovery once per trip into the air", () => {
    const state = fightNow(["samurai"]);
    const f = state.fighters[0]!;
    hang(f, 14, 2);
    const recovery = MOVESETS.samurai.heavyUp;
    const events = run(state, recovery.frames + 10, (_, frame) => (frame === 0 || frame === recovery.frames + 4 ? { x: 0, y: 1, heavy: true } : undefined));
    expect(events.filter((e) => e.type === "swing" && e.move === "heavyUp")).toHaveLength(1);
    expect(f.recoveryUsed).toBe(true);
    expect(f.airJumps).toBe(0);
  });

  it("gives the jump and recovery back on landing", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    hang(f, 0, 1);
    f.airJumps = 0;
    f.recoveryUsed = true;
    run(state, 40);
    expect(f.ground).toBe(0);
    expect(f.airJumps).toBe(1);
    expect(f.recoveryUsed).toBe(false);
  });

  it("cannot act while in hitstun", () => {
    const state = fightNow(["karate", "bear"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1.2, -1);
    b!.percent = 60;
    run(state, MOVESETS.karate.side.hitboxes[0]!.from + 1, once(0, 0, { x: 1, y: 0, light: true }));
    expect(b!.action).toBe("hurt");
    run(state, 2, once(1, 0, { x: 0, y: 0, light: true }));
    expect(b!.action).toBe("hurt");
    expect(b!.move).toBeNull();
  });

  it("hangs in the air while casting, but sinks, so casting again and again cannot stall", () => {
    const state = fightNow(["mage"]);
    const f = state.fighters[0]!;
    hang(f, 14, 3);
    const frames = MOVESETS.mage.heavy.frames;
    run(state, frames * 4, (_, frame) => (frame % (frames + 1) === 0 ? { x: 0, y: 0, heavy: true } : undefined));
    expect(f.pos.y).toBeLessThan(1);
    // A plain fall over the same time would have dropped well past this.
    expect(f.pos.y).toBeGreaterThan(-4);
  });

  it("changes direction with the double jump", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    hang(f, 0, 3);
    f.vel.x = 5;
    run(state, 1, once(0, 0, { x: -1, y: 1, jump: true }));
    expect(f.vel.x).toBeLessThan(0);
  });
});
