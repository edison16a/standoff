import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { FifaKeys, keyboard } from "./keyboard";
import { padButtonFor } from "./keyboard-rules";
import type { PhoneState } from "./protocol";

function state(over: Partial<PhoneState> = {}): PhoneState {
  return {
    kind: "state",
    phase: "play",
    name: "Keyboard",
    taken: [],
    pick: "striker",
    ready: true,
    team: 0,
    playing: true,
    score: [0, 0],
    clock: 90,
    golden: false,
    hasBall: true,
    goals: 0,
    result: null,
    banner: null,
    skip: null,
    role: "striker",
    defending: false,
    guard: null,
    setPiece: null,
    ...over,
  };
}

function setup(initial: PhoneState | null = state()) {
  let host: PhoneState | null = initial;
  let time = 0;
  const sent: Payload[] = [];
  const lossy: Payload[] = [];
  const ctx = { seat: 1, send: (p: Payload) => sent.push(p), sendLossy: (p: Payload) => lossy.push(p), last: () => host };
  const keys = new FifaKeys(ctx, () => time);
  return {
    keys,
    sent,
    lossy,
    setHost: (next: PhoneState | null) => (host = next),
    wait: (ms: number) => (time += ms),
  };
}

describe("Soccer keyboard", () => {
  it("streams the stick only while the controller is up", () => {
    const t = setup(state({ phase: "lobby" }));
    t.keys.key("KeyD", true);
    t.keys.tick();
    expect(t.lossy).toEqual([]);
    t.setHost(state());
    t.keys.tick();
    expect(t.lossy.at(-1)).toEqual({ kind: "pad", x: 1, y: 0, held: [] });
  });

  it("taps Space to pass and holds it to shoot, telling the host how long", () => {
    const t = setup();
    t.keys.tick();
    t.keys.key("KeyW", true);
    t.keys.key("Space", true);
    expect(t.sent).toEqual([{ kind: "pad-press", button: "shoot", down: true, x: 0, y: 1 }]);
    t.keys.tick();
    expect(t.lossy.at(-1)).toMatchObject({ held: ["shoot"] });
    t.wait(640);
    t.keys.key("Space", false);
    expect(t.sent.slice(1)).toEqual([
      { kind: "release", heldMs: 640 },
      { kind: "pad-press", button: "shoot", down: false, x: 0, y: 1 },
    ]);
  });

  it("makes Space and Shift hold Guard while defending, heard once", () => {
    const t = setup(state({ defending: true, hasBall: false }));
    t.keys.tick();
    t.keys.key("ShiftLeft", true);
    t.keys.key("Space", true);
    expect(t.sent).toEqual([{ kind: "pad-press", button: "guard", down: true, x: 0, y: 0 }]);
    t.keys.key("KeyQ", true);
    t.keys.key("KeyF", true);
    expect(t.sent.slice(1).map((p) => p.button)).toEqual(["jump", "steal"]);
  });

  it("presses Slide or Skill on E and keeps Steal off with the ball", () => {
    const t = setup();
    t.keys.tick();
    t.keys.key("KeyE", true);
    t.keys.key("KeyF", true);
    t.keys.key("KeyQ", true);
    expect(t.sent).toEqual([{ kind: "pad-press", button: "slide", down: true, x: 0, y: 0 }]);
  });

  it("lets go with no shot when the layout changes", () => {
    const t = setup();
    t.keys.tick();
    t.keys.key("Space", true);
    t.setHost(state({ defending: true, hasBall: false }));
    t.keys.tick();
    expect(t.sent.at(-1)).toEqual({ kind: "pad-press", button: "shoot", down: false, x: 0, y: 0 });
    expect(t.sent.some((p) => p.kind === "release")).toBe(false);
    t.keys.key("Space", false);
    expect(t.sent).toHaveLength(2);
  });

  it("lets a held shot go when the play stops, as the phone's button does", () => {
    const t = setup();
    t.keys.tick();
    t.keys.key("Space", true);
    t.wait(300);
    t.setHost(state({ phase: "goal" }));
    t.keys.tick();
    expect(t.sent.slice(1)).toEqual([
      { kind: "release", heldMs: 300 },
      { kind: "pad-press", button: "shoot", down: false, x: 0, y: 0 },
    ]);
  });

  it("only gives the taker a button at a set piece, and votes to skip a replay", () => {
    const sp = { kind: "free" as const, part: "taker" as const, stage: "aim" as const };
    expect(padButtonFor("big", state({ phase: "setpiece", setPiece: sp }))).toBe("shoot");
    expect(padButtonFor("big", state({ phase: "setpiece", setPiece: { ...sp, part: "wall" } }))).toBeNull();
    expect(padButtonFor("slide", state({ phase: "setpiece", setPiece: sp }))).toBeNull();
    expect(padButtonFor("big", state({ phase: "replay", skip: { agreed: false, count: 0, total: 2 } }))).toBe("shoot");
    expect(padButtonFor("big", state({ phase: "replay", skip: { agreed: true, count: 1, total: 2 } }))).toBeNull();
  });

  it("lets every held button go when focus is lost", () => {
    const t = setup();
    t.keys.tick();
    t.keys.key("KeyE", true);
    t.keys.release();
    expect(t.sent.at(-1)).toEqual({ kind: "pad-press", button: "slide", down: false, x: 0, y: 0 });
  });

  it("drops the phone screen's own stick stream", () => {
    expect(keyboard.replaces).toEqual(["pad"]);
  });
});
