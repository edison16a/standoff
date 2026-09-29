import { describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { EDGE, HostAim, insideBox, pinToEdge, zonePixels } from "./host-aim";

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
    // Calibrated on the left half; its middle is the bottom middle edge of the top left quarter, held just inside.
    aim.setZone(2, TOP_LEFT_QUARTER);
    close(settle(aim, 2), 0, -EDGE);
    const fired = vi.fn();
    aim.onFire(fired);
    say(2, { kind: "aim-fire", x: 0, y: 1 });
    expect(fired.mock.calls[0]![1].y).toBeCloseTo(EDGE, 9);
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

  it("holds a dot pointed past the edge at the edge, and lets it come straight back in", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    const fired = vi.fn();
    aim.onFire(fired);
    say(5, { kind: "aim", x: 1.15, y: -1.15 });
    close(settle(aim, 5), EDGE, -EDGE);
    say(5, { kind: "aim-fire", x: -1.1, y: 0.2 });
    expect(fired).toHaveBeenCalledWith(5, { x: -EDGE, y: 0.2 });
    // Back in from the edge: the very next frame moves inward, with no dead time spent easing back from past the edge.
    let clock = performance.now() + 5000;
    const end = clock + 1000;
    const now = vi.spyOn(performance, "now").mockImplementation(() => clock);
    say(5, { kind: "aim", x: 1.15, y: 0 });
    for (; clock < end; clock += 16) aim.point(5, clock);
    say(5, { kind: "aim", x: 0.9, y: 0 });
    // Ten milliseconds: unpinned, the dot would still be easing back from past the edge.
    expect(aim.point(5, clock + 10)!.x).toBeLessThan(EDGE - 0.01);
    now.mockRestore();
    aim.dispose();
  });

  it("tells when a seat's aim is held at the edge, and lets go the moment it comes back in", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    aim.setZone(7, LEFT_HALF);
    say(7, { kind: "aim-step", step: "center" });
    expect(aim.atEdge(7)).toBe(false);
    say(7, { kind: "aim", x: 0.3, y: 1.15 });
    expect(aim.atEdge(7)).toBe(true);
    // Straight back, before the drawn dot has eased away from the edge.
    say(7, { kind: "aim", x: 0.3, y: 0.9 });
    expect(aim.atEdge(7)).toBe(false);
    // A phone gone quiet is not aiming anywhere.
    say(7, { kind: "aim", x: -1.15, y: 0 });
    expect(aim.atEdge(7, performance.now() + 5000)).toBe(false);
    expect(aim.atEdge(8)).toBe(false);
    aim.dispose();
  });

  it("targets every corner a sword game asks for", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    for (const step of ["top-right", "bottom-left"]) {
      say(6, { kind: "aim-step", step });
      expect(aim.step(6)).toBe(step);
    }
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

describe("keeping the pointer in sight at the edge", () => {
  it("pins a point past the edge to the edge and leaves one inside alone", () => {
    expect(pinToEdge({ x: 1.15, y: -1.4 })).toEqual({ x: EDGE, y: -EDGE });
    // Only a touch inside the true edge, so a target near it can still be hit.
    expect(EDGE).toBeGreaterThan(0.94);
    expect(pinToEdge({ x: -0.3, y: 0.9 })).toEqual({ x: -0.3, y: 0.9 });
  });

  it("draws a dot at the edge far enough inside that all of it shows", () => {
    const box = { x: 100, y: 0, w: 400, h: 300 };
    expect(insideBox({ x: 500, y: 0 }, box, 14)).toEqual({ x: 486, y: 14 });
    expect(insideBox({ x: 250, y: 150 }, box, 14)).toEqual({ x: 250, y: 150 });
    // A zone too small for the margin keeps the dot in its middle rather than past either side.
    expect(insideBox({ x: 0, y: 0 }, { x: 0, y: 0, w: 10, h: 10 }, 14)).toEqual({ x: 5, y: 5 });
  });
});
