import { describe, expect, it } from "vitest";
import { RESERVED_KINDS } from "@/platform/games/game-api";
import { isPadKind } from "@/games/kit/pad/protocol";
import { hostMessageSchema, phoneMessageSchema, type PhoneState } from ".";

const STATE: PhoneState = {
  kind: "state",
  phase: "fight",
  pick: "bear",
  ready: true,
  playing: true,
  percent: 87,
  stocks: 2,
  ult: 0.5,
  out: false,
  kos: 1,
  place: null,
  banner: "Fight",
};

describe("the messages", () => {
  it("accept what the host and phones send", () => {
    expect(hostMessageSchema.parse(STATE)).toEqual(STATE);
    expect(hostMessageSchema.parse({ kind: "buzz", event: "ko" })).toEqual({ kind: "buzz", event: "ko" });
    expect(phoneMessageSchema.parse({ kind: "pick", character: "samurai" })).toEqual({ kind: "pick", character: "samurai" });
    expect(phoneMessageSchema.parse({ kind: "ready", ready: false }).kind).toBe("ready");
    expect(phoneMessageSchema.parse({ kind: "hello" }).kind).toBe("hello");
  });

  it("refuse unknown fighters and values out of range", () => {
    expect(phoneMessageSchema.safeParse({ kind: "pick", character: "ninja" }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, ult: 1.5 }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, percent: 12.5 }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, place: 5 }).success).toBe(false);
  });

  it("never use a kind the platform or the pad kit keeps for itself", () => {
    for (const kind of ["state", "buzz", "pick", "ready", "hello"]) {
      expect(RESERVED_KINDS).not.toContain(kind);
      expect(isPadKind(kind)).toBe(false);
    }
  });
});
