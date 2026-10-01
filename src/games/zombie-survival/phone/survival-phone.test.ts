// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { Phase } from "../engine/events";
import type { PhoneMessage, StateMessage } from "../protocol/messages";
import { SurvivalPhone } from "./survival-phone";

// The button clicks are sounds, which a test has no speakers for.
vi.mock("@/platform/audio/voices", () => ({ tone: () => {} }));

/** A room the test talks through as if it were the host, keeping what the phone sends. */
function fakeRoom() {
  let listener: ((event: PhoneRoomEvent) => void) | null = null;
  const sent: PhoneMessage[] = [];
  const room = {
    seat: 1,
    motion: "unavailable",
    audio: { bus: () => null, now: 0 },
    send: (payload: PhoneMessage) => void sent.push(payload),
    sendLossy: () => {},
    on: (next: (event: PhoneRoomEvent) => void) => {
      listener = next;
      return () => (listener = null);
    },
  } as unknown as PhoneRoomApi;
  const host = (phase: Phase) => {
    const state: StateMessage = { kind: "state", phase, stage: 1, stageTitle: "Main Street", objective: "", health: 100, maxHealth: 100, seats: [] };
    listener?.({ type: "message", payload: state });
  };
  const reconnect = () => listener?.({ type: "rejoined" });
  return { room, host, reconnect, sent };
}

const readies = (sent: PhoneMessage[]) => sent.filter((m) => m.kind === "ready").length;

describe("the survival phone after a reconnect", () => {
  let phone: SurvivalPhone | null = null;
  afterEach(() => phone?.dispose());

  it("sends its ready again from the lobby", () => {
    const { room, host, reconnect, sent } = fakeRoom();
    phone = new SurvivalPhone(room);
    host("lobby");
    phone.setReady(true);
    sent.length = 0;
    reconnect();
    expect(readies(sent)).toBe(1);
  });

  it("does not send a ready from before the run, which may have ended while it was away", () => {
    const { room, host, reconnect, sent } = fakeRoom();
    phone = new SurvivalPhone(room);
    host("lobby");
    phone.setReady(true);
    host("fight");
    sent.length = 0;
    reconnect();
    // One ready starts a run, so a stale one would start the next run for everybody.
    expect(readies(sent)).toBe(0);
  });
});
