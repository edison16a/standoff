import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";
import { HostAim } from "./host-aim";
import { STEP_REPEAT_MS, StepSender } from "./step-sender";
import { isNewer, stamper } from "./step-stamp";

function hostRoom() {
  const listeners = new Set<(event: HostRoomEvent) => void>();
  const room = { on: (listener: (event: HostRoomEvent) => void) => (listeners.add(listener), () => listeners.delete(listener)) } as unknown as HostRoomApi;
  const emit = (event: HostRoomEvent) => listeners.forEach((listener) => listener(event));
  const say = (seat: number, payload: Payload) => emit({ type: "message", seat, payload });
  return { room, say, emit };
}

afterEach(() => vi.useRealTimers());

describe("stamps on calibration steps", () => {
  it("count up per page, and a new page or an unstamped step always counts", () => {
    const next = stamper("a");
    const first = next();
    const second = next();
    expect(isNewer(first, second)).toBe(true);
    expect(isNewer(second, first)).toBe(false);
    expect(isNewer(second, second)).toBe(false);
    expect(isNewer(second, { from: "b", n: 1 })).toBe(true);
    expect(isNewer(undefined, first)).toBe(true);
    expect(isNewer(second, undefined)).toBe(true);
  });
});

describe("the phone's step sender", () => {
  it("stamps each step, repeats it once, and stops repeating a step it has moved past", () => {
    vi.useFakeTimers();
    const sent: Payload[] = [];
    const steps = new StepSender({ send: (payload) => sent.push(payload) });
    steps.announce("bottom-left");
    steps.announce("done");
    vi.advanceTimersByTime(STEP_REPEAT_MS);
    expect(sent.map((p) => p.step)).toEqual(["bottom-left", "done", "done"]);
    expect(sent.map((p) => p.n)).toEqual([1, 2, 3]);
    steps.resend();
    expect(sent.at(-1)).toMatchObject({ step: "done", n: 4 });
    steps.announce("center");
    steps.cancel();
    vi.advanceTimersByTime(STEP_REPEAT_MS * 2);
    expect(sent).toHaveLength(5);
  });
});

describe("the host's calibration targets", () => {
  it("ignores a target that arrives after the done it came before", () => {
    const { room, say, emit } = hostRoom();
    const aim = new HostAim(room);
    const page = { from: "ph1" };
    say(1, { kind: "aim-step", step: "done", ...page, n: 7 });
    say(1, { kind: "aim-step", step: "bottom-left", ...page, n: 6 });
    expect(aim.step(1)).toBe("done");
    // Still ignored once the phone has dropped and its seat was forgotten.
    emit({ type: "left", seat: 1 });
    say(1, { kind: "aim-step", step: "bottom-left", ...page, n: 5 });
    expect(aim.step(1)).toBeNull();
    // A reloaded page counts from the start again and is heard.
    say(1, { kind: "aim-step", step: "center", from: "ph2", n: 1 });
    expect(aim.step(1)).toBe("center");
    aim.dispose();
  });

  it("forgets a ready seat's target, and shows the next one if the player calibrates again", () => {
    const { room, say } = hostRoom();
    const aim = new HostAim(room);
    say(2, { kind: "aim-step", step: "bottom-left", from: "ph", n: 1 });
    say(3, { kind: "aim-step", step: "test", from: "ph", n: 1 });
    aim.endCalibration(2);
    aim.endCalibration(3);
    aim.endCalibration(4);
    expect(aim.step(2)).toBeNull();
    expect(aim.step(3)).toBe("test");
    expect(aim.step(4)).toBeNull();
    say(2, { kind: "aim-step", step: "center", from: "ph", n: 2 });
    expect(aim.step(2)).toBe("center");
    aim.dispose();
  });
});
