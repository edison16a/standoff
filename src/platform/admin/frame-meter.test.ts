import { describe, expect, it, vi } from "vitest";
import { FrameMeter, meterVisible, setMeterVisible, subscribeMeter } from "./frame-meter";

describe("frame meter", () => {
  it("reads zero before two frames", () => {
    const meter = new FrameMeter();
    expect(meter.fps).toBe(0);
    meter.frame(0);
    expect(meter.fps).toBe(0);
  });

  it("measures a steady rate", () => {
    const meter = new FrameMeter();
    for (let i = 0; i <= 120; i++) meter.frame(i * (1000 / 60));
    expect(meter.fps).toBe(60);
  });

  it("forgets frames older than a second", () => {
    const meter = new FrameMeter();
    for (let i = 0; i <= 60; i++) meter.frame(i * (1000 / 60));
    for (let i = 1; i <= 60; i++) meter.frame(1000 + i * (1000 / 30));
    expect(meter.fps).toBe(30);
  });

  it("tells listeners when it shows or hides", () => {
    const listener = vi.fn();
    const stop = subscribeMeter(listener);
    setMeterVisible(true);
    setMeterVisible(true);
    expect(meterVisible()).toBe(true);
    setMeterVisible(false);
    stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
