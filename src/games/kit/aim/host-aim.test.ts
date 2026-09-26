import { describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { HostAim, zonePixels } from "./host-aim";

/** A room that lets a test play phone messages into the host. */
function fakeRoom() {
  const listeners = new Set<(event: HostRoomEvent) => void>();
  const room = { on: (listener: (event: HostRoomEvent) => void) => (listeners.add(listener), () => listeners.delete(listener)) } as unknown as HostRoomApi;
  const say = (seat: number, payload: Record<string, unknown>) => {
    for (const listener of listeners) listener({ type: "message", seat, payload: payload as never });
  };
  return { room, say };
}

/** Lets the drawn dot catch up with the phone, as a second of frames would. */
function settle(aim: HostAim, seat: number): { x: number; y: number } {
  const start = performance.now();
  let point = aim.point(seat, start);
  for (let t = 100; t <= 1100; t += 100) point = aim.point(seat, start + t);
  return point!;
}

const close = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 9);
  expect(p.y).toBeCloseTo(y, 9);
};

const LEFT_HALF = { x: 0, y: 0, w: 0.5, h: 1 };
const TOP_LEFT_QUARTER = { x: 0, y: 0, w: 0.5, h: 0.5 };

describe("the host's aim", () => {
  it("hands games without zones the phone's points exactly as sent", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    const fired = vi.fn();
    aim.onFire(fired);
    say(1, { kind: "aim-step", step: "center" });
    say(1, { kind: "aim", x: 0.3125, y: -0.4375 });
    close(settle(aim, 1), 0.3125, -0.4375);
    say(1, { kind: "aim-fire", x: -0.71, y: 0.27 });
    expect(fired).toHaveBeenCalledWith(1, { x: -0.71, y: 0.27 });
    expect(aim.zone(1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(zonePixels({ x: 0.5, y: 0.5 }, aim.zone(1), 800, 400)).toEqual({ x: 600, y: 100 });
    aim.dispose();
  });

  it("keeps a player's aim in their zone, and on the same spot of the screen when the zone changes", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    aim.setZone(2, LEFT_HALF);
    say(2, { kind: "aim-step", step: "center" });
    say(2, { kind: "aim-step", step: "test" });
    say(2, { kind: "aim", x: 0, y: 0 });
    close(settle(aim, 2), 0, 0);
    // Calibrated on the left half; its middle is the bottom middle edge of the top left quarter.
    aim.setZone(2, TOP_LEFT_QUARTER);
    close(settle(aim, 2), 0, -1);
    const fired = vi.fn();
    aim.onFire(fired);
    say(2, { kind: "aim-fire", x: 0, y: 1 });
    expect(fired.mock.calls[0]![1].y).toBeCloseTo(1, 9);
    aim.dispose();
  });

  it("moves the calibration with a zone that changes while its targets show", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    say(3, { kind: "aim-step", step: "top-left" });
    aim.setZone(3, TOP_LEFT_QUARTER);
    say(3, { kind: "aim", x: 0.5, y: 0.5 });
    close(settle(aim, 3), 0.5, 0.5);
    aim.dispose();
  });

  it("lets a drag aimed player, who never sees a target, follow their zone", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    aim.setZone(4, LEFT_HALF);
    say(4, { kind: "aim-step", step: "test" });
    say(4, { kind: "aim", x: 0.25, y: 0.75 });
    aim.setZone(4, TOP_LEFT_QUARTER);
    close(settle(aim, 4), 0.25, 0.75);
    aim.setZone(4, null);
    expect(aim.zone(4)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    aim.dispose();
  });
});
