import { describe, expect, it } from "vitest";
import type { Payload } from "@/platform/protocol";
import { KartKeys, keyboard } from "./keyboard";
import type { PhoneState } from "./protocol";

function state(over: Partial<PhoneState> = {}): PhoneState {
  return {
    kind: "state",
    phase: "racing",
    map: "beach",
    taken: [],
    pick: "blaze",
    ready: true,
    racing: true,
    countdown: null,
    place: 1,
    karts: 4,
    lap: 1,
    laps: 2,
    item: null,
    rolling: false,
    next: null,
    nextRolling: false,
    uses: 0,
    wrongWay: false,
    finished: false,
    effect: null,
    surge: 0,
    drift: null,
    ...over,
  };
}

function setup(initial: PhoneState = state()) {
  let host = initial;
  const sent: Payload[] = [];
  const lossy: Payload[] = [];
  const keys = new KartKeys({ seat: 1, send: (p) => sent.push(p), sendLossy: (p) => lossy.push(p), last: () => host });
  return { keys, sent, lossy, setHost: (next: PhoneState) => (host = next) };
}

describe("Magic Kart keyboard", () => {
  it("sends a pedal change at once and reliably", () => {
    const t = setup();
    t.keys.key("KeyW", true);
    expect(t.sent).toEqual([{ kind: "input", steer: 0, drive: true, brake: false }]);
    t.keys.key("KeyW", false);
    t.keys.key("ArrowDown", true);
    expect(t.sent.at(-1)).toEqual({ kind: "input", steer: 0, drive: false, brake: true });
  });

  it("steers full lock and streams it on the tick", () => {
    const t = setup();
    t.keys.key("KeyA", true);
    expect(t.sent).toEqual([]);
    t.keys.tick();
    expect(t.lossy).toEqual([{ kind: "input", steer: -1, drive: false, brake: false }]);
  });

  it("holds Brake with Shift while Drive stays down, for a power slide", () => {
    const t = setup();
    t.keys.key("KeyW", true);
    t.keys.key("KeyD", true);
    t.keys.key("ShiftLeft", true);
    expect(t.sent.at(-1)).toEqual({ kind: "input", steer: 1, drive: true, brake: true });
    t.keys.key("ShiftLeft", false);
    expect(t.sent.at(-1)).toEqual({ kind: "input", steer: 1, drive: true, brake: false });
  });

  it("uses a power up only once it has stopped rolling, mid race", () => {
    const t = setup(state({ item: "orb", rolling: true }));
    t.keys.key("Space", true);
    t.keys.key("Space", false);
    expect(t.sent).toEqual([]);
    t.setHost(state({ item: "orb" }));
    t.keys.key("KeyE", true);
    expect(t.sent).toEqual([{ kind: "use" }]);
  });

  it("sends nothing in the lobby or once the race is over", () => {
    const t = setup(state({ phase: "lobby", racing: false }));
    t.keys.key("KeyW", true);
    t.keys.tick();
    t.setHost(state({ phase: "results" }));
    t.keys.tick();
    expect([...t.sent, ...t.lossy]).toEqual([]);
  });

  it("drives from the countdown, for a rocket start", () => {
    const t = setup(state({ phase: "countdown", countdown: 1 }));
    t.keys.key("ArrowUp", true);
    expect(t.sent).toEqual([{ kind: "input", steer: 0, drive: true, brake: false }]);
  });

  it("lifts every pedal when focus is lost", () => {
    const t = setup();
    t.keys.key("KeyW", true);
    t.keys.release();
    expect(t.sent.at(-1)).toEqual({ kind: "input", steer: 0, drive: false, brake: false });
  });

  it("replaces the phone screen's own input stream", () => {
    expect(keyboard.replaces).toEqual(["input"]);
  });
});
