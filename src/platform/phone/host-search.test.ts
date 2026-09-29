import { afterEach, describe, expect, it, vi } from "vitest";
import { HostSearch, LOOK_AFTER_AWAY_MS } from "./host-search";

describe("HostSearch", () => {
  afterEach(() => void vi.useRealTimers());

  it("looks where new connections go a few times while the host stays away", () => {
    vi.useFakeTimers();
    const look = vi.fn();
    const search = new HostSearch(() => true, look);
    search.start();
    vi.advanceTimersByTime(LOOK_AFTER_AWAY_MS[0]! - 1);
    expect(look).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(look).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(look).toHaveBeenCalledTimes(LOOK_AFTER_AWAY_MS.length);
  });

  it("stops once the host is back", () => {
    vi.useFakeTimers();
    let away = true;
    const look = vi.fn();
    const search = new HostSearch(() => away, look);
    search.start();
    vi.advanceTimersByTime(LOOK_AFTER_AWAY_MS[0]!);
    away = false;
    vi.advanceTimersByTime(60_000);
    expect(look).toHaveBeenCalledTimes(1);
    search.start();
    search.stop();
    vi.advanceTimersByTime(60_000);
    expect(look).toHaveBeenCalledTimes(1);
  });
});
