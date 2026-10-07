// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhoneRoomApi } from "@/platform/games/game-api";
import type { PhoneState } from "../../protocol";
import { FootballPhone } from "../football-phone";
import { Controller } from "./Controller";
import { PhoneContext } from "./session-context";

const BASE: PhoneState = {
  phase: "live", pad: "qb", team: 0, role: "qb", playing: true, pick: null, taken: [], ready: true,
  score: [0, 0], quarter: 1, overtime: false, clock: 300, down: "1st and 10", offense: true,
  choose: null, hikeLeft: null, meter: null, withBall: true, canThrow: true, runPlay: false, canPitch: false, canRun: true,
  jukeReady: true, jukeCool: 0, stamina: 1, rushReady: true, guarding: false, grounded: false, banner: null, skip: null, result: null, stats: null, switched: false,
} as unknown as PhoneState;

/** A pointer event as the browser sends it. jsdom has no PointerEvent, so a mouse event carries the id. */
function pointer(type: string, x: number, y: number): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 7 });
  return event;
}

let container: HTMLDivElement;
let root: Root;
let phone: FootballPhone;

async function show(host: PhoneState) {
  await act(async () =>
    root.render(
      <PhoneContext.Provider value={phone}>
        <Controller host={host} />
      </PhoneContext.Provider>,
    ),
  );
}

describe("the move stick when the QB presses Run", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Element.prototype.setPointerCapture = vi.fn();
    const room = { on: () => () => {}, send: vi.fn(), sendLossy: vi.fn() } as unknown as PhoneRoomApi;
    phone = new FootballPhone(room);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    phone.dispose();
    container.remove();
  });

  it("keeps the same stick, still held and still steering, through the switch to the runner's pad", async () => {
    await show(BASE);
    const stick = container.querySelector(".kit-stick")!;
    await act(async () => {
      stick.dispatchEvent(pointer("pointerdown", 100, 100));
      stick.dispatchEvent(pointer("pointermove", 164, 100));
    });
    expect(phone.pad.current.x).toBeCloseTo(1);

    await show({ ...BASE, pad: "runner", canThrow: false, canRun: false });
    expect(container.querySelector(".kit-stick")).toBe(stick);
    expect(phone.pad.current.x).toBeCloseTo(1);
    expect(stick.querySelector(".kit-stick__base--rest")).toBeNull();

    // The same touch carries on steering the runner.
    await act(async () => {
      stick.dispatchEvent(pointer("pointermove", 100, 36));
    });
    expect(phone.pad.current.y).not.toBe(0);
    expect(phone.pad.current.x).toBeCloseTo(0);
  });

  it("still centres the stick when the pad changes to one without it", async () => {
    await show(BASE);
    const stick = container.querySelector(".kit-stick")!;
    await act(async () => {
      stick.dispatchEvent(pointer("pointerdown", 100, 100));
      stick.dispatchEvent(pointer("pointermove", 164, 100));
    });
    await show({ ...BASE, phase: "dead", pad: "wait" });
    expect(phone.pad.current).toEqual({ x: 0, y: 0 });
  });
});
