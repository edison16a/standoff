// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import { TARGET_INSET } from "./aim-math";
import { PhoneAim } from "./phone-aim";

/** Fires one orientation reading, as a phone pointing at a compass heading and elevation would. */
function point(headingDeg: number, upDeg: number): void {
  const event = new Event("deviceorientation");
  Object.assign(event, { alpha: -headingDeg, beta: upDeg, gamma: 0 });
  window.dispatchEvent(event);
}

function fakeRoom(motion: "granted" | "unavailable" = "granted") {
  const sent: Payload[] = [];
  const lossy: Payload[] = [];
  const listeners = new Set<(event: PhoneRoomEvent) => void>();
  const room = {
    seat: 1,
    motion,
    send: (payload: Payload) => sent.push(payload),
    sendLossy: (payload: Payload) => lossy.push(payload),
    on: (listener: (event: PhoneRoomEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as PhoneRoomApi;
  const emit = (event: PhoneRoomEvent) => listeners.forEach((listener) => listener(event));
  return { room, sent, lossy, emit, listeners };
}

describe("the phone's aim", () => {
  let aim: PhoneAim | null = null;
  afterEach(() => {
    aim?.dispose();
    vi.useRealTimers();
  });

  it("maps the calibration targets onto the screen and streams the aim", () => {
    vi.useFakeTimers();
    const { room, sent, lossy } = fakeRoom();
    aim = new PhoneAim(room);
    point(40, 2);
    expect(aim.setCenter()).toBe(true);
    point(25, 10);
    aim.setCorner("top-left");
    point(58, -7);
    aim.setCorner("bottom-right");

    point(40, 2);
    vi.advanceTimersByTime(1000);
    point(40, 2);
    expect(aim.current.x).toBeCloseTo(0, 2);
    expect(aim.current.y).toBeCloseTo(0, 2);

    // Settle on the top left target so the smoothing catches up.
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(16);
      point(25, 10);
    }
    expect(aim.current.x).toBeCloseTo(-TARGET_INSET, 1);
    expect(aim.current.y).toBeCloseTo(TARGET_INSET, 1);

    aim.stream(true);
    vi.advanceTimersByTime(50);
    expect(lossy.at(-1)).toMatchObject({ kind: "aim" });
    aim.fire();
    expect(sent.at(-1)).toMatchObject({ kind: "aim-fire" });
  });

  it("falls back to dragging when no sensor reading ever arrives", () => {
    vi.useFakeTimers();
    const { room } = fakeRoom();
    aim = new PhoneAim(room);
    vi.advanceTimersByTime(2000);
    expect(aim.getSnapshot().source).toBe("touch");
    aim.nudge(0.5, -0.25);
    expect(aim.current).toEqual({ x: 0.5, y: -0.25 });
  });

  it("keeps saved spans whole screen, and scales them to a zone when reused", () => {
    vi.useFakeTimers();
    localStorage.clear();
    const settle = (heading: number, up: number) => {
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(16);
        point(heading, up);
      }
    };
    // Measured across the whole screen: the top left target is 16 degrees left and 9 up.
    const { room } = fakeRoom();
    aim = new PhoneAim(room);
    point(0, 0);
    aim.setCenter();
    point(-16, 9);
    aim.setCorner("top-left");
    point(16, -9);
    aim.setCorner("bottom-right");
    settle(-8, 0);
    expect(aim.current.x).toBeCloseTo(-TARGET_INSET / 2, 1);
    aim.dispose();

    // Reused in the left half of the screen, the same turn crosses twice as much of the view.
    aim = new PhoneAim(fakeRoom().room);
    aim.setZone({ x: 0, y: 0, w: 0.5, h: 1 });
    point(0, 0);
    aim.setCenter();
    aim.useQuick();
    settle(-8, 0);
    expect(aim.current.x).toBeCloseTo(-TARGET_INSET, 1);
    settle(0, 4.5);
    expect(aim.current.y).toBeCloseTo(TARGET_INSET / 2, 1);
  });

  it("recentres on the current aim without losing the spans", () => {
    vi.useFakeTimers();
    const { room } = fakeRoom();
    aim = new PhoneAim(room);
    point(0, 0);
    aim.setCenter();
    aim.useQuick();
    for (let i = 0; i < 60; i++) {
      vi.advanceTimersByTime(16);
      point(10, 0);
    }
    expect(aim.current.x).toBeGreaterThan(0.3);
    aim.recenter();
    point(10, 0);
    expect(aim.current.x).toBeCloseTo(0, 2);
  });

  it("shows its calibration target again after a reconnect, and lets go of the room when done", () => {
    const { room, sent, emit, listeners } = fakeRoom();
    aim = new PhoneAim(room);
    emit({ type: "rejoined" });
    expect(sent).toEqual([]);
    aim.announce("top-left");
    emit({ type: "rejoined" });
    expect(sent.slice(-1)).toEqual([{ kind: "aim-step", step: "top-left" }]);
    expect(sent).toHaveLength(2);
    aim.dispose();
    aim = null;
    expect(listeners.size).toBe(0);
  });
});
