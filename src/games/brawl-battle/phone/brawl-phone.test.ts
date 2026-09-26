import { describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import { BrawlPhone } from "./brawl-phone";
import { usePhoneStore } from "./phone-store";

function fakeRoom() {
  const listeners = new Set<(event: PhoneRoomEvent) => void>();
  const room = {
    code: "TEST",
    seat: 1,
    seats: 4,
    audio: {} as PhoneRoomApi["audio"],
    motion: "unavailable",
    send: vi.fn(),
    sendLossy: vi.fn(),
    on(listener: (event: PhoneRoomEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } satisfies PhoneRoomApi;
  const emit = (payload: unknown) => listeners.forEach((listener) => listener({ type: "message", payload: payload as never }));
  return { room, emit };
}

describe("BrawlPhone", () => {
  it("flashes a word for a big moment", () => {
    const { room, emit } = fakeRoom();
    const phone = new BrawlPhone(room);
    emit({ kind: "buzz", event: "fall" });
    expect(usePhoneStore.getState().flash?.text).toBe("Lost a life");
    phone.dispose();
  });

  it("forgets the last word when the controller goes, so the next match starts clean", () => {
    const { room, emit } = fakeRoom();
    const phone = new BrawlPhone(room);
    phone.stream(true);
    emit({ kind: "buzz", event: "ko" });
    expect(usePhoneStore.getState().flash).not.toBeNull();
    phone.stream(false);
    expect(usePhoneStore.getState().flash).toBeNull();
    phone.dispose();
  });

  it("lets go of every held button when the controller goes", () => {
    const { room } = fakeRoom();
    const phone = new BrawlPhone(room);
    phone.stream(true);
    phone.press("attack");
    phone.setStick({ x: 0, y: 1 });
    room.send.mockClear();
    phone.stream(false);
    const released = room.send.mock.calls.map(([payload]) => payload as { button: string; down: boolean });
    expect(released).toEqual(expect.arrayContaining([expect.objectContaining({ button: "attack", down: false }), expect.objectContaining({ button: "up", down: false })]));
    phone.dispose();
  });
});
