import { describe, expect, it } from "vitest";
import { RESERVED_KINDS } from "@/platform/games/game-api";
import { isAimKind } from "@/games/kit/aim/protocol";
import { hostMessageSchema, phoneMessageSchema, type PhoneState } from ".";

const STATE: PhoneState = {
  kind: "state",
  phase: "match",
  mode: "2v2",
  team: 1,
  teammate: "Sam",
  zone: { x: 0.5, y: 0, w: 0.5, h: 0.5 },
  gun: "smg",
  character: "runner",
  ready: true,
  playing: true,
  health: 64,
  alive: true,
  ammo: 12,
  magazine: 32,
  reloading: false,
  reloadLeft: 0,
  armed: true,
  round: 3,
  score: [2, 1],
  kills: 4,
  deaths: 2,
  won: null,
  banner: "Round 3",
};

describe("the messages", () => {
  it("accept what the host and phones send", () => {
    expect(hostMessageSchema.parse(STATE)).toEqual(STATE);
    expect(hostMessageSchema.parse({ kind: "buzz", event: "head" })).toEqual({ kind: "buzz", event: "head" });
    expect(phoneMessageSchema.parse({ kind: "gun", gun: "sniper" })).toEqual({ kind: "gun", gun: "sniper" });
    expect(phoneMessageSchema.parse({ kind: "trigger", down: true }).kind).toBe("trigger");
    for (const kind of ["reload", "hello"]) expect(phoneMessageSchema.parse({ kind }).kind).toBe(kind);
    expect(phoneMessageSchema.parse({ kind: "ready", ready: false }).kind).toBe("ready");
  });

  it("refuse unknown guns and values out of range", () => {
    expect(phoneMessageSchema.safeParse({ kind: "gun", gun: "bazooka" }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, health: 101 }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, score: [6, 0] }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, team: 2 }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, ammo: 2.5 }).success).toBe(false);
    expect(hostMessageSchema.safeParse({ ...STATE, zone: { x: 0.5, y: 0, w: 1.5, h: 1 } }).success).toBe(false);
  });

  it("never use a kind the platform or the aim kit keeps for itself", () => {
    for (const kind of ["state", "buzz", "gun", "ready", "trigger", "reload", "hello"]) {
      expect(RESERVED_KINDS).not.toContain(kind);
      expect(isAimKind(kind)).toBe(false);
    }
  });
});
