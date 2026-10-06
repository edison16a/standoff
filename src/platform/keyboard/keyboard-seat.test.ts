import { describe, expect, it } from "vitest";
import type { PageMessage } from "./bridge";
import { KeyboardSeat } from "./keyboard-seat";
import type { RuntimeTimers } from "./keyboard-runtime";
import { StickKeys } from "./stick-keys";
import type { KeyboardBinding, KeyboardContext } from "./types";
import type { VirtualState } from "./virtual-phone";

const seated: VirtualState = { stage: "playing", seat: 2, name: "Keyboard", game: "magic-kart" };
const key = (code: string, down: boolean, repeat = false) => ({ code, down, repeat });

function setup() {
  const toPanel: PageMessage[] = [];
  const keys: string[] = [];
  const ticks: (() => void)[] = [];
  let ctx: KeyboardContext | null = null;
  let released = 0;
  const binding: KeyboardBinding = {
    controls: [],
    replaces: ["input"],
    create(c) {
      ctx = c;
      const stick = new StickKeys();
      return {
        key: (code, down) => {
          keys.push(`${code} ${down}`);
          return stick.key(code, down);
        },
        tick: () => c.sendLossy({ kind: "input", x: stick.vector().x }),
        release: () => released++,
      };
    },
  };
  const timers: RuntimeTimers = { every: (_, run) => (ticks.push(run), () => ticks.splice(0)) };
  const seat = new KeyboardSeat(binding, (m) => toPanel.push(m), undefined, timers);
  return { seat, toPanel, keys, ticks, ctx: () => ctx, released: () => released };
}

describe("KeyboardSeat", () => {
  it("waits for the seat, then starts the binding once and claims its kinds", () => {
    const { seat, toPanel, ctx } = setup();
    expect(seat.key(key("KeyW", true))).toBe(false);
    seat.fromPanel({ type: "status", state: seated });
    seat.fromPanel({ type: "status", state: seated });
    expect(ctx()?.seat).toBe(2);
    expect(toPanel).toEqual([{ type: "replace", kinds: ["input"] }]);
  });

  it("routes what the binding sends down to the panel as this seat", () => {
    const { seat, toPanel, ticks } = setup();
    seat.fromPanel({ type: "status", state: seated });
    seat.key(key("KeyD", true));
    ticks[0]!();
    expect(toPanel.at(-1)).toEqual({ type: "send", payload: { kind: "input", x: 1 }, lossy: true });
  });

  it("reads back what the host last said to the seat", () => {
    const { seat, ctx } = setup();
    seat.fromPanel({ type: "status", state: seated });
    seat.fromPanel({ type: "host", payload: { kind: "state", phase: "lobby" } });
    seat.fromPanel({ type: "host", payload: { kind: "buzz" } });
    expect(ctx()?.last("state")).toEqual({ kind: "state", phase: "lobby" });
    expect(ctx()?.last()).toEqual({ kind: "buzz" });
    expect(ctx()?.last("missing")).toBeNull();
  });

  it("passes each press once, keeps its repeats blocked and frees unused keys", () => {
    const { seat, keys } = setup();
    seat.fromPanel({ type: "status", state: seated });
    expect(seat.key(key("KeyW", true))).toBe(true);
    expect(seat.key(key("KeyW", true, true))).toBe(true);
    expect(seat.key(key("KeyQ", true))).toBe(false);
    expect(seat.key(key("KeyQ", true, true))).toBe(false);
    expect(seat.key(key("KeyW", false))).toBe(true);
    expect(keys).toEqual(["KeyW true", "KeyQ true", "KeyW false"]);
  });

  it("takes keys from the panel the same way", () => {
    const { seat, keys } = setup();
    seat.fromPanel({ type: "status", state: seated });
    seat.fromPanel({ type: "key", input: key("ArrowLeft", true) });
    expect(keys).toEqual(["ArrowLeft true"]);
  });

  it("lets go of every held key on a release, then tells the binding", () => {
    const { seat, keys, released } = setup();
    seat.fromPanel({ type: "status", state: seated });
    seat.key(key("KeyW", true));
    seat.key(key("KeyA", true));
    seat.release();
    expect(keys.slice(2).sort()).toEqual(["KeyA false", "KeyW false"]);
    expect(released()).toBe(1);
    // The key up that finally arrives is old news.
    expect(seat.key(key("KeyW", false))).toBe(false);
  });

  it("stops ticking once disposed", () => {
    const { seat, ticks } = setup();
    seat.fromPanel({ type: "status", state: seated });
    expect(ticks).toHaveLength(1);
    seat.dispose();
    expect(ticks).toHaveLength(0);
  });

  it("does nothing for a game without a binding", () => {
    const toPanel: PageMessage[] = [];
    const seat = new KeyboardSeat(undefined, (m) => toPanel.push(m));
    seat.fromPanel({ type: "status", state: seated });
    expect(seat.key(key("KeyW", true))).toBe(false);
    expect(toPanel).toEqual([]);
  });
});
