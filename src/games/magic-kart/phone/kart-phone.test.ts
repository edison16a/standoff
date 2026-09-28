// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import type { PhoneState } from "../protocol";
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
  const listeners = new Set<(event: PhoneRoomEvent) => void>();
  const room = {
    code: "KART",
    seat: 1,
    motion,
    audio: { bus: () => null, now: 0 },
    send: (payload: Payload) => sent.push(payload),
    sendLossy: () => {},
    on: (listener: (event: PhoneRoomEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as PhoneRoomApi;
  const hostSays = (payload: Partial<PhoneState>) => listeners.forEach((fn) => fn({ type: "message", payload: { ...LOBBY, ...payload } }));
  return { room, sent, hostSays };
}

const LOBBY: PhoneState = {
  kind: "state",
  phase: "lobby",
  map: "beach",
  taken: [],
  pick: null,
  ready: false,
  racing: false,
  countdown: null,
  place: null,
  karts: 0,
  lap: 0,
  laps: 2,
  item: null,
  rolling: false,
  wrongWay: false,
  finished: false,
  effect: null,
  surge: 0,
  drift: null,
};

describe("the kart phone", () => {
  let phone: KartPhone | null = null;
  afterEach(() => {
    phone?.dispose();
    phone = null;
    sessionStorage.clear();
  });

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
    hold(44, -80);
    expect(phone.steer).toBeGreaterThan(0.6);
    hold(-36, -80);
    expect(phone.steer).toBeLessThan(-0.6);
  });

  it("comes back after a reload where it left off, calibration included", () => {
    phone = new KartPhone(fakeRoom("granted").room);
    hold(24, -80);
    phone.calibrate();
    phone.pick("nova");
    phone.goTo("ready");
    phone.dispose();

    // A reload makes a fresh controller for the same room and seat.
    phone = new KartPhone(fakeRoom("granted").room);
    const state = useControllerStore.getState();
    expect(state).toMatchObject({ step: "ready", calibrated: true, wanted: "nova", steerMode: "tilt" });
    hold(24, -80);
    expect(phone.steer).toBe(0);
  });

  it("asks for its driver again when the host lost it, and only then", () => {
    phone = new KartPhone(fakeRoom("granted").room);
    phone.pick("pip");
    phone.dispose();

    const lost = fakeRoom("granted");
    phone = new KartPhone(lost.room);
    lost.hostSays({ pick: null });
    expect(lost.sent).toContainEqual({ kind: "pick", character: "pip" });
    phone.dispose();

    const kept = fakeRoom("granted");
    phone = new KartPhone(kept.room);
    kept.hostSays({ pick: "pip" });
    expect(kept.sent.filter((m) => m.kind === "pick")).toEqual([]);
  });

  it("steers with buttons after a reload that lost motion access", () => {
    phone = new KartPhone(fakeRoom("granted").room);
    hold(4, -80);
    phone.calibrate();
    phone.dispose();
    phone = new KartPhone(fakeRoom("unavailable").room);
    expect(useControllerStore.getState()).toMatchObject({ steerMode: "buttons", calibrated: true });
  });

  it("gets the wheel back after a reload that gained motion access", () => {
    phone = new KartPhone(fakeRoom("unavailable").room);
    phone.goTo("kart");
    phone.dispose();
    phone = new KartPhone(fakeRoom("granted").room);
    expect(useControllerStore.getState()).toMatchObject({ step: "kart", steerMode: "tilt", calibrated: false });
  });

  it("starts fresh in a different room", () => {
    phone = new KartPhone(fakeRoom("granted").room);
    phone.goTo("kart");
    phone.dispose();
    const other = fakeRoom("granted");
    phone = new KartPhone({ ...other.room, code: "OTHR" });
    expect(useControllerStore.getState().step).toBe("calibrate");
  });
});
