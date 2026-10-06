import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { BrawlKeys, keyboard } from "./keyboard";
import type { PhoneState } from "./protocol";

function state(over: Partial<PhoneState> = {}): PhoneState {
  return { kind: "state", phase: "fight", pick: "karate", ready: true, playing: true, percent: 0, stocks: 3, ult: 0, out: false, kos: 0, place: null, banner: null, ...over };
}

function setup(initial: PhoneState = state()) {
  let host = initial;
  const sent: Payload[] = [];
  const lossy: Payload[] = [];
  const keys = new BrawlKeys({ seat: 2, send: (p) => sent.push(p), sendLossy: (p) => lossy.push(p), last: () => host });
  return { keys, sent, lossy, setHost: (next: PhoneState) => (host = next) };
}

describe("Brawl Battle keyboard", () => {
  it("moves like a d-pad, a full push on each axis", () => {
    const t = setup();
    t.keys.key("KeyD", true);
    t.keys.key("KeyS", true);
    t.keys.tick();
    expect(t.lossy.at(-1)).toEqual({ kind: "pad", x: 1, y: -1, held: [] });
  });

  it("jumps on Space with the Up press alone, and on W with the stick up too", () => {
    const t = setup();
    t.keys.key("Space", true);
    expect(t.sent).toEqual([{ kind: "pad-press", button: "up", down: true, x: 0, y: 0 }]);
    t.keys.key("Space", false);
    expect(t.sent.at(-1)).toMatchObject({ button: "up", down: false });
    t.keys.key("ArrowUp", true);
    expect(t.sent.at(-1)).toEqual({ kind: "pad-press", button: "up", down: true, x: 0, y: 1 });
    // Space while up is already held sends nothing more.
    t.keys.key("Space", true);
    expect(t.sent).toHaveLength(3);
  });

  it("holds Attack and Special down until their keys come up, for charged moves", () => {
    const t = setup();
    t.keys.key("KeyJ", true);
    t.keys.key("KeyE", true);
    t.keys.tick();
    expect(t.lossy.at(-1)).toMatchObject({ held: ["attack", "special"] });
    t.keys.key("KeyJ", false);
    expect(t.sent.map((p) => [p.button, p.down])).toEqual([
      ["attack", true],
      ["special", true],
      ["attack", false],
    ]);
  });

  it("presses Ult only when the meter is full, and lets go once it is spent", () => {
    const t = setup();
    t.keys.key("KeyQ", true);
    expect(t.sent).toEqual([]);
    t.keys.key("KeyQ", false);
    t.setHost(state({ ult: 1 }));
    t.keys.key("KeyL", true);
    expect(t.sent).toEqual([{ kind: "pad-press", button: "ult", down: true, x: 0, y: 0 }]);
    t.setHost(state({ ult: 0.1 }));
    t.keys.tick();
    expect(t.sent.at(-1)).toMatchObject({ button: "ult", down: false });
  });

  it("shields with Shift as a held stick down", () => {
    const t = setup();
    t.keys.key("ShiftLeft", true);
    expect(t.keys.axes()).toEqual({ x: 0, y: -1 });
  });

  it("sends nothing outside a fight and lets go when the fight ends", () => {
    const t = setup(state({ phase: "lobby" }));
    t.keys.key("KeyJ", true);
    t.keys.tick();
    expect(t.sent).toEqual([]);
    expect(t.lossy).toEqual([]);
    t.keys.key("KeyJ", false);
    t.setHost(state());
    t.keys.key("KeyF", true);
    t.setHost(state({ phase: "results" }));
    t.keys.tick();
    expect(t.sent.at(-1)).toMatchObject({ button: "attack", down: false });
  });

  it("lets go of everything when focus is lost", () => {
    const t = setup();
    t.keys.key("KeyW", true);
    t.keys.key("KeyK", true);
    t.keys.release();
    expect(t.sent.slice(-2).map((p) => [p.button, p.down])).toEqual([
      ["special", false],
      ["up", false],
    ]);
  });

  it("replaces the phone screen's stick stream", () => {
    expect(keyboard.replaces).toEqual(["pad"]);
  });
});
