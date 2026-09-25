// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import { useControllerStore } from "./controller-store";
import { KartPhone } from "./kart-phone";

// The button click is a sound, and there is no audio here.
vi.mock("@/platform/audio/voices", () => ({ tone: () => {} }));

/** Fires one orientation reading, as the phone's sensors would. */
function hold(beta: number, gamma: number): void {
  const event = new Event("deviceorientation");
  Object.assign(event, { alpha: 0, beta, gamma });
  window.dispatchEvent(event);
}

function fakeRoom(motion: "granted" | "unavailable") {
  const sent: Payload[] = [];
  const room = {
    seat: 1,
    motion,
    audio: { bus: () => null, now: 0 },
    send: (payload: Payload) => sent.push(payload),
    sendLossy: () => {},
    on: () => () => {},
  } as unknown as PhoneRoomApi;
  return { room, sent };
}

describe("the kart phone", () => {
  let phone: KartPhone | null = null;
  afterEach(() => phone?.dispose());

  it("lets a phone with no sensors through setup and steers with the arrows", () => {
    phone = new KartPhone(fakeRoom("unavailable").room);
    const state = useControllerStore.getState();
    expect(state.steerMode).toBe("buttons");
    // Nothing to calibrate, so Next must not wait for it.
    expect(state.calibrated).toBe(true);
    phone.setPedals({ right: true });
    expect(phone.steer).toBe(1);
  });

  it("steers from the wheel measured from where it was calibrated", () => {
    // jsdom's window is wider than tall, which reads as landscape with the top edge on the left.
    phone = new KartPhone(fakeRoom("granted").room);
    expect(useControllerStore.getState().calibrated).toBe(false);
    hold(4, -80);
    phone.calibrate();
    expect(phone.steer).toBe(0);
    hold(24, -80);
    expect(phone.steer).toBeGreaterThan(0.4);
    hold(-16, -80);
    expect(phone.steer).toBeLessThan(-0.4);
  });
});
