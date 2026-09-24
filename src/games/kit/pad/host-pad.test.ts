import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import { HostPad } from "./host-pad";

function fakeRoom() {
  let listener: ((event: HostRoomEvent) => void) | null = null;
  const room = {
    on: (next: (event: HostRoomEvent) => void) => {
      listener = next;
      return () => (listener = null);
    },
  } as unknown as HostRoomApi;
  const emit = (event: HostRoomEvent) => listener?.(event);
  return { room, emit };
}

describe("the host's gamepads", () => {
  afterEach(() => vi.useRealTimers());

  it("reports each press and release once, ignoring resends", () => {
    const { room, emit } = fakeRoom();
    const pad = new HostPad(room);
    const presses: string[] = [];
    pad.onPress((seat, button, down) => presses.push(`${seat}:${button}:${down}`));
    const press = (down: boolean) => emit({ type: "message", seat: 2, payload: { kind: "pad-press", button: "shoot", down, x: 0.5, y: 0 } });
    press(true);
    press(true);
    expect(pad.isHeld(2, "shoot")).toBe(true);
    press(false);
    expect(presses).toEqual(["2:shoot:true", "2:shoot:false"]);
    expect(pad.stick(2)).toEqual({ x: 0.5, y: 0 });
  });

  it("centres the stick of a phone that goes quiet", () => {
    vi.useFakeTimers();
    const { room, emit } = fakeRoom();
    const pad = new HostPad(room);
    emit({ type: "message", seat: 1, payload: { kind: "pad", x: 1, y: 0, held: [] } });
    expect(pad.stick(1).x).toBe(1);
    expect(pad.stick(1, performance.now() + 2000)).toEqual({ x: 0, y: 0 });
  });

  it("releases everything a leaving phone held", () => {
    const { room, emit } = fakeRoom();
    const pad = new HostPad(room);
    const presses: string[] = [];
    pad.onPress((seat, button, down) => presses.push(`${seat}:${button}:${down}`));
    emit({ type: "message", seat: 3, payload: { kind: "pad-press", button: "block", down: true, x: 0, y: 0 } });
    emit({ type: "left", seat: 3 });
    expect(presses).toEqual(["3:block:true", "3:block:false"]);
    expect(pad.isHeld(3, "block")).toBe(false);
  });

  it("ignores payloads that are not the pad's", () => {
    const { room, emit } = fakeRoom();
    const pad = new HostPad(room);
    emit({ type: "message", seat: 1, payload: { kind: "pad", x: 5, y: 0, held: [] } });
    emit({ type: "message", seat: 1, payload: { kind: "shoot" } });
    expect(pad.stick(1)).toEqual({ x: 0, y: 0 });
  });
});
