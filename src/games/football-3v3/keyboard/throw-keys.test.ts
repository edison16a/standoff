import { describe, expect, it } from "vitest";
import type { PhoneMessage, PhoneState } from "../protocol";
import { ThrowKeys } from "./throw-keys";

const OPEN = { canThrow: true, throws: [true, true, true, true] } as unknown as PhoneState;
const CLOSED = { canThrow: false, throws: [false, false, false, false] } as unknown as PhoneState;

function keys() {
  const sent: PhoneMessage[] = [];
  return { t: new ThrowKeys((m) => sent.push(m)), sent };
}

describe("holding a number to throw on the keyboard", () => {
  it("lights the runner while held and throws as the key comes up", () => {
    const { t, sent } = keys();
    t.down(1, OPEN);
    expect(sent).toEqual([{ kind: "highlight", slot: 1 }]);
    t.update(OPEN);
    expect(sent).toHaveLength(1);
    t.up(1, OPEN);
    expect(sent).toEqual([{ kind: "highlight", slot: 1 }, { kind: "throw", slot: 1 }]);
  });

  it("moves the light to another number pressed while held, and only that key throws", () => {
    const { t, sent } = keys();
    t.down(0, OPEN);
    t.down(3, OPEN);
    t.up(0, OPEN);
    expect(sent).toEqual([{ kind: "highlight", slot: 0 }, { kind: "highlight", slot: 3 }]);
    t.up(3, OPEN);
    expect(sent.at(-1)).toEqual({ kind: "throw", slot: 3 });
  });

  it("cancels on Escape: the light goes out and letting go throws nothing", () => {
    const { t, sent } = keys();
    t.down(2, OPEN);
    expect(t.cancel(OPEN)).toBe(true);
    t.up(2, OPEN);
    expect(sent).toEqual([{ kind: "highlight", slot: 2 }, { kind: "highlight", slot: null }]);
    expect(t.cancel(OPEN)).toBe(false);
  });

  it("ends the hold when the throw window closes, and lights nothing greyed out", () => {
    const { t, sent } = keys();
    t.down(2, OPEN);
    t.update(CLOSED);
    t.up(2, OPEN);
    expect(sent).toEqual([{ kind: "highlight", slot: 2 }, { kind: "highlight", slot: null }]);
    t.down(1, CLOSED);
    expect(sent).toHaveLength(2);
  });
});
