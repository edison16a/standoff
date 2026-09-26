// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import { AimOverlay } from "./AimOverlay";
import { HostAim } from "./host-aim";

/** A 2D context that records what is drawn, and fails as a browser does on a point that is not a number. */
function recordingContext(calls: { name: string; args: unknown[] }[]) {
  const finite = (name: string, args: unknown[]) => {
    if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) throw new TypeError(`${name}: non-finite value`);
  };
  const gradient = { addColorStop: () => undefined };
  return new Proxy(
    { canvas: { clientHeight: 400 }, measureText: () => ({ width: 80 }) },
    {
      get(target, key: string) {
        if (key in target) return (target as Record<string, unknown>)[key];
        return (...args: unknown[]) => {
          finite(key, args);
          calls.push({ name: key, args });
          return key === "createRadialGradient" ? gradient : undefined;
        };
      },
      set: () => true,
    },
  );
}

function fakeRoom() {
  const listeners = new Set<(event: HostRoomEvent) => void>();
  const room = { on: (listener: (event: HostRoomEvent) => void) => (listeners.add(listener), () => listeners.delete(listener)) } as unknown as HostRoomApi;
  const say = (seat: number, payload: Record<string, unknown>) => {
    for (const listener of listeners) listener({ type: "message", seat, payload: payload as never });
  };
  return { room, say };
}

const PLAYERS: Player[] = [
  { seat: 1, name: "Ana", connected: true },
  { seat: 2, name: "Ben", connected: true },
];

describe("the aim overlay", () => {
  let frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;
  const calls: { name: string; args: unknown[] }[] = [];
  const step = () => {
    const due = [...frames.values()];
    frames = new Map();
    for (const f of due) f(performance.now());
  };

  beforeEach(() => {
    frames = new Map();
    calls.length = 0;
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => (frames.set(nextFrame, f), nextFrame++));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
    HTMLCanvasElement.prototype.getContext = (() => recordingContext(calls)) as unknown as HTMLCanvasElement["getContext"];
    Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", { get: () => 800, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", { get: () => 400, configurable: true });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows each player's targets inside their zone, then their dot, and no dots once asked not to", () => {
    const { room, say } = fakeRoom();
    const aim = new HostAim(room);
    aim.setZone(1, { x: 0, y: 0, w: 0.5, h: 1 });
    aim.setZone(2, { x: 0.5, y: 0, w: 0.5, h: 1 });
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(createElement(AimOverlay, { aim, players: () => PLAYERS, dots: true })));

    say(1, { kind: "aim-step", step: "center" });
    say(2, { kind: "aim-step", step: "top-left" });
    step();
    // Ana's middle target is the middle of the left half; Ben's top left target is near the top left of the right half.
    const rings = calls.filter((c) => c.name === "arc" && c.args[2] === 7);
    expect(rings.map((c) => [Math.round(c.args[0] as number), Math.round(c.args[1] as number)])).toEqual([
      [200, 200],
      [440, 40],
    ]);
    // Both zones are outlined.
    expect(calls.filter((c) => c.name === "setLineDash")).toHaveLength(2);

    say(1, { kind: "aim-step", step: "test" });
    say(1, { kind: "aim", x: 0.5, y: 0.5 });
    calls.length = 0;
    step();
    expect(calls.some((c) => c.name === "createRadialGradient")).toBe(true);

    say(1, { kind: "aim-step", step: "done" });
    say(2, { kind: "aim-step", step: "done" });
    act(() => root.render(createElement(AimOverlay, { aim, players: () => PLAYERS, dots: false })));
    calls.length = 0;
    step();
    expect(calls.some((c) => c.name === "clearRect")).toBe(true);
    expect(calls.some((c) => c.name === "createRadialGradient")).toBe(false);
    act(() => root.unmount());
    aim.dispose();
  });
});
