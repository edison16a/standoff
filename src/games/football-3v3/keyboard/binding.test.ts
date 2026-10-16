import { describe, expect, it } from "vitest";
import type { KeyboardContext } from "@/platform/keyboard";
import type { PhoneState } from "../protocol";
import { phoneMessageSchema } from "../protocol";
import { keyboard } from "./binding";
import { FootballKeys } from "./controller";

const BASE = {
  kind: "state", phase: "live", name: "Kim", taken: [], pick: "gunslinger", ready: true, team: 0, role: "qb", playing: true,
  score: [0, 0], quarter: 1, overtime: false, clock: 150, down: "1st and 10", offense: true, switched: false, pad: "qb",
  choose: null, book: null, aim: 1, hikeLeft: null, meter: null, withBall: true, canThrow: true, throws: [true, true, true, true], backSlot: null,
  runPlay: false, canPitch: false, canRun: true, jukeReady: true, jukeCool: 0, stamina: 1, rushReady: true, guarding: false, grounded: false,
  banner: null, skip: null, result: null, stats: null,
} satisfies PhoneState;

/** A seat with a fake clock, recording what it sends. */
function seat(state: Partial<PhoneState> = {}) {
  const sent: Record<string, unknown>[] = [];
  let now = 1000;
  let current: PhoneState = { ...BASE, ...state };
  const ctx: KeyboardContext = {
    seat: 0,
    send: (p) => sent.push(p as Record<string, unknown>),
    sendLossy: (p) => sent.push({ ...(p as Record<string, unknown>), lossy: true }),
    last: () => current,
  };
  const keys = new FootballKeys(ctx, () => now);
  return {
    keys, sent,
    wait: (ms: number) => (now += ms),
    set: (s: Partial<PhoneState>) => (current = { ...current, ...s }),
    reliable: () => sent.filter((p) => !p.lossy),
  };
}

describe("football keyboard", () => {
  it("lists every control on the card and replaces the phone's streams", () => {
    const actions = keyboard.controls.flatMap((g) => g.rows.map((r) => r.action));
    for (const a of ["Move", "Juke", "Dive", "Hike", "Tackle", "Rush", "Throw, Run, Kick", "Stop the kick meter"]) expect(actions.some((b) => b.startsWith(a))).toBe(true);
    expect(actions.some((b) => b.startsWith("Throw to runner"))).toBe(true);
    expect(keyboard.replaces).toEqual(["pad"]);
  });

  it("hikes with Space before the snap", () => {
    const s = seat({ phase: "presnap", canThrow: false });
    s.keys.key("Space", true);
    expect(s.reliable()[0]).toMatchObject({ kind: "pad-press", button: "hike", down: true });
  });

  it("throws to a runner by his number, as the phone's colour buttons do", () => {
    const s = seat();
    s.keys.key("Digit3", true);
    s.keys.key("Digit3", false);
    const thrown = s.reliable();
    expect(thrown).toEqual([{ kind: "throw", slot: 2 }]);
    expect(phoneMessageSchema.safeParse(thrown[0]).success).toBe(true);
  });

  it("throws nothing to a button the phone shows greyed out, and Space alone never throws", () => {
    const s = seat({ throws: [true, false, true, true] });
    s.keys.key("Digit2", true);
    s.keys.key("Space", true);
    s.keys.key("Space", false);
    expect(s.reliable()).toEqual([]);
  });

  it("throws on a run call too, where Space pitches", () => {
    const s = seat({ runPlay: true, canPitch: true, backSlot: 1 });
    s.keys.key("Digit4", true);
    s.keys.key("Space", true);
    expect(s.reliable()).toEqual([{ kind: "throw", slot: 3 }, expect.objectContaining({ kind: "pad-press", button: "pass" })]);
  });

  it("pitches with Space on a run call and takes off with Shift", () => {
    const s = seat({ runPlay: true, canPitch: true });
    s.keys.key("Space", true);
    s.keys.key("ShiftLeft", true);
    expect(s.reliable().map((p) => p.button)).toEqual(["pass", "run"]);
  });

  it("tackles, rushes and guards on defence", () => {
    const s = seat({ pad: "defense", role: "runner", withBall: false, canThrow: false });
    s.keys.key("KeyF", true);
    s.keys.key("ShiftRight", true);
    s.keys.key("KeyG", true);
    s.keys.tick();
    expect(s.reliable().map((p) => p.button)).toEqual(["tackle", "rush", "guard"]);
    expect(s.sent.find((p) => p.kind === "pad")).toMatchObject({ held: ["guard"] });
    s.keys.key("KeyG", false);
    expect(s.reliable().at(-1)).toMatchObject({ button: "guard", down: false });
  });

  it("steers with W A S D in every press and the stream", () => {
    const s = seat({ pad: "runner", withBall: true });
    s.keys.key("KeyD", true);
    s.keys.key("KeyE", true);
    s.keys.tick();
    expect(s.reliable()[0]).toMatchObject({ button: "juke", x: 1, y: 0 });
    expect(s.sent.find((p) => p.kind === "pad")).toMatchObject({ x: 1, y: 0 });
  });

  it("picks the play call with the number keys in the order the phone shows", () => {
    const s = seat({ pad: "choose", phase: "choose", choose: { options: ["throw", "run", "kick"], left: 8 } });
    s.keys.key("Digit2", true);
    expect(s.reliable()[0]).toEqual({ kind: "call", call: "run" });
    s.set({ phase: "convert", choose: { options: ["kick", "two"], left: 8 } });
    s.keys.key("Digit2", true);
    expect(s.reliable()[1]).toEqual({ kind: "call", call: "two" });
  });

  it("stops the kick meters on its own clock", () => {
    const s = seat({ pad: "kicker", phase: "kick", meter: { stage: "aim", fieldGoal: true } });
    s.keys.tick();
    s.wait(300);
    s.keys.key("Space", true);
    s.keys.key("Space", false);
    s.wait(400);
    s.keys.key("Space", true);
    const kicks = s.reliable().filter((p) => p.kind === "kick");
    expect(kicks).toHaveLength(2);
    for (const k of kicks) expect(Math.abs(k.value as number)).toBeLessThanOrEqual(1);
  });

  it("lets go of everything when the window loses focus", () => {
    const s = seat({ pad: "defense", role: "runner", withBall: false, canThrow: false, throws: [] });
    s.keys.key("KeyG", true);
    s.keys.release();
    s.keys.key("KeyG", false);
    expect(s.reliable().map((p) => [p.button, p.down])).toEqual([["guard", true], ["guard", false]]);
  });
});
