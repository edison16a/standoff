// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import { useControllerStore as store } from "./controller-store";
import { NbaPhone } from "./nba-phone";

// The button click is a sound, and there is no audio here.
vi.mock("@/platform/audio/voices", () => ({ tone: () => {} }));

function fakeRoom() {
  const listeners: ((event: PhoneRoomEvent) => void)[] = [];
  const room = {
    seat: 1,
    motion: "unavailable",
    audio: { bus: () => null, now: 0 },
    send: (payload: Payload) => void payload,
    sendLossy: () => {},
    on: (listener: (event: PhoneRoomEvent) => void) => {
      listeners.push(listener);
      return () => {};
    },
  } as unknown as PhoneRoomApi;
  const fromHost = (payload: Payload) => listeners.forEach((l) => l({ type: "message", payload }));
  return { room, fromHost };
}

describe("the NBA phone", () => {
  let phone: NbaPhone | null = null;
  afterEach(() => {
    phone?.stream(false);
    phone?.dispose();
  });

  it("flashes words on the controller and forgets them when it goes", () => {
    const { room, fromHost } = fakeRoom();
    phone = new NbaPhone(room);
    phone.stream(true);
    fromHost({ kind: "buzz", event: "win", text: "You win!" });
    expect(store.getState().flash?.text).toBe("You win!");
    // The results take over, then Play again brings the controller back: no stale word.
    phone.stream(false);
    expect(store.getState().flash).toBeNull();
    fromHost({ kind: "buzz", event: "score", text: "+2" });
    phone.stream(true);
    expect(store.getState().flash).toBeNull();
  });

  it("drops a shot meter left running when the controller goes", () => {
    const { room } = fakeRoom();
    phone = new NbaPhone(room);
    phone.stream(true);
    phone.press("shoot");
    expect(store.getState().aimingSince).not.toBeNull();
    phone.stream(false);
    phone.stream(true);
    expect(store.getState().aimingSince).toBeNull();
  });
});
