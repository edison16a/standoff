import { afterEach, describe, expect, it, vi } from "vitest";
import { TriggerHold } from "./trigger";

describe("holding the trigger", () => {
  afterEach(() => vi.useRealTimers());

  it("fires once for a semi automatic gun", () => {
    vi.useFakeTimers();
    const fire = vi.fn();
    const trigger = new TriggerHold(fire);
    trigger.press(false, 1.4);
    vi.advanceTimersByTime(3000);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("keeps firing at the weapon's rate until released", () => {
    vi.useFakeTimers();
    const fire = vi.fn();
    const trigger = new TriggerHold(fire);
    trigger.press(true, 10);
    vi.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledTimes(11);
    trigger.release();
    vi.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledTimes(11);
    expect(trigger.held).toBe(false);
  });
});
