import { describe, expect, it } from "vitest";
import type { KeyboardContext } from "@/platform/keyboard";
import type { PhoneState } from "../protocol";
import { phoneMessageSchema } from "../protocol";
import { keyboard } from "./binding";
import { FootballKeys } from "./controller";
import { mouseStick } from "./throw-keys";

const BASE = {
  kind: "state", phase: "live", name: "Kim", taken: [], pick: "gunslinger", ready: true, team: 0, role: "qb", playing: true,
  score: [0, 0], quarter: 1, overtime: false, clock: 150, down: "1st and 10", offense: true, switched: false, pad: "qb",
  choose: null, hikeLeft: null, meter: null, withBall: true, canThrow: true, throwWindow: { center: 0.8, green: 0.08, gold: 0.014 },
  runPlay: false, canPitch: false, canRun: true, jukeReady: true, rushReady: true, guarding: false, grounded: false,
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
    for (const a of ["Move", "Juke", "Dive", "Hike", "Tackle", "Rush", "Throw, Run, Kick", "Stop the kick meter"]) expect(actions).toContain(a);
    expect(keyboard.replaces).toEqual(["pad", "aim"]);
  });

  it("hikes with Space before the snap", () => {
    const s = seat({ phase: "presnap", canThrow: false });
    s.keys.key("Space", true);
    expect(s.reliable()[0]).toMatchObject({ kind: "pad-press", button: "hike", down: true });
  });

  it("holds the throw meter on Space and throws on release with the time held and the arrow's aim", () => {
    const s = seat();
    s.keys.key("Space", true);
    expect(s.reliable()[0]).toEqual({ kind: "hold", down: true });
    s.keys.key("ArrowLeft", true);
    s.keys.tick();
    expect(s.sent.some((p) => p.kind === "aim" && p.x === -1)).toBe(true);
    s.wait(780);
    s.keys.key("Space", false);
    const thrown = s.reliable().find((p) => p.kind === "throw")!;
    expect(thrown).toMatchObject({ x: -1, y: 0, heldMs: 780 });
    expect(phoneMessageSchema.safeParse(thrown).success).toBe(true);
  });

  it("throws straight up the field when nothing aimed", () => {
    const s = seat();
    s.keys.key("Space", true);
    s.keys.key("Space", false);
    expect(s.reliable().find((p) => p.kind === "throw")).toMatchObject({ x: 0, y: 1 });
  });

  it("throws with the left mouse button toward the pointer", () => {
    const s = seat();
    s.keys.pointer({ type: "move", x: 0.5, y: 0.5, button: 0 });
    s.keys.pointer({ type: "down", x: 0.5, y: 0.5, button: 0 });
    s.keys.pointer({ type: "up", x: 0.5, y: 0.5, button: 0 });
    const thrown = s.reliable().find((p) => p.kind === "throw")!;
    const aim = mouseStick({ x: 0.5, y: 0.5 })!;
    expect(thrown.x).toBeCloseTo(aim.x);
    expect(thrown.y).toBeCloseTo(aim.y);
    expect(aim.x).toBeGreaterThan(0);
    expect(aim.y).toBeGreaterThan(0);
  });

  it("pitches with Space on a run call and takes off with Shift", () => {
    const s = seat({ runPlay: true, throwWindow: null, canPitch: true });
    s.keys.key("Space", true);
    s.keys.key("ShiftLeft", true);
    expect(s.reliable().map((p) => p.button)).toEqual(["pass", "run"]);
  });

  it("tackles, rushes and guards on defence", () => {
    const s = seat({ pad: "defense", role: "runner", withBall: false, canThrow: false, throwWindow: null });
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
    const s = seat({ pad: "runner", withBall: true, throwWindow: null });
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
    const s = seat();
    s.keys.key("Space", true);
    s.keys.release();
    expect(s.reliable().at(-1)).toEqual({ kind: "hold", down: false });
  });
});
