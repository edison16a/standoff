import { describe, expect, it, vi } from "vitest";
import { RafLimiter, type FrameHost } from "./raf-limiter";

/** A stand in for window whose refreshes the test steps by hand. */
class FakeScreen implements FrameHost {
  private pending = new Map<number, FrameRequestCallback>();
  private next = 1;
  now = 0;
  constructor(private readonly hz: number) {}

  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    this.pending.set(this.next, callback);
    return this.next++;
  };

  cancelAnimationFrame = (handle: number): void => {
    this.pending.delete(handle);
  };

  /** One refresh: runs everything asked for before it. */
  refresh(): void {
    this.now += 1000 / this.hz;
    const batch = this.pending;
    this.pending = new Map();
    for (const callback of batch.values()) callback(this.now);
  }

  get waiting(): number {
    return this.pending.size;
  }
}

/** A game style loop that asks for the next frame each frame and records times. */
function loop(host: FrameHost): { times: number[]; stop: () => void } {
  const times: number[] = [];
  let handle = 0;
  const step = (now: number) => {
    times.push(now);
    handle = host.requestAnimationFrame(step);
  };
  handle = host.requestAnimationFrame(step);
  return { times, stop: () => host.cancelAnimationFrame(handle) };
}

describe("RafLimiter", () => {
  it("holds a loop to the cap with the refresh's own timestamps", () => {
    const screen = new FakeScreen(120);
    new RafLimiter(screen).setRate(60, 120);
    const game = loop(screen);
    for (let i = 0; i < 240; i++) screen.refresh();
    expect(game.times).toHaveLength(120);
    const [first = NaN, second = NaN] = game.times;
    expect(second - first).toBeCloseTo(1000 / 60, 6);
  });

  it("runs several loops together on the same frames", () => {
    const screen = new FakeScreen(144);
    new RafLimiter(screen).setRate(60, 144);
    const a = loop(screen);
    const b = loop(screen);
    for (let i = 0; i < 144; i++) screen.refresh();
    expect(a.times).toEqual(b.times);
    expect(Math.abs(a.times.length - 60)).toBeLessThanOrEqual(1);
  });

  it("cancels a waiting callback and stops asking the browser when idle", () => {
    const screen = new FakeScreen(60);
    new RafLimiter(screen).setRate(30, 60);
    const game = loop(screen);
    screen.refresh();
    game.stop();
    expect(screen.waiting).toBe(0);
    for (let i = 0; i < 10; i++) screen.refresh();
    expect(game.times).toHaveLength(1);
  });

  it("keeps working when one callback throws", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const screen = new FakeScreen(60);
    new RafLimiter(screen).setRate(30, 60);
    const seen: string[] = [];
    screen.requestAnimationFrame(() => {
      throw new Error("boom");
    });
    screen.requestAnimationFrame(() => seen.push("ran"));
    screen.refresh();
    expect(seen).toEqual(["ran"]);
    report.mockRestore();
  });

  it("gives the browser's functions back at Max without losing a loop", () => {
    const screen = new FakeScreen(120);
    const native = screen.requestAnimationFrame;
    const nativeCancel = screen.cancelAnimationFrame;
    const limiter = new RafLimiter(screen);
    limiter.setRate(60, 120);
    expect(screen.requestAnimationFrame).not.toBe(native);
    const game = loop(screen);
    screen.refresh();
    limiter.setRate(null);
    expect(screen.requestAnimationFrame).toBe(native);
    for (let i = 0; i < 10; i++) screen.refresh();
    // Every refresh runs once the cap is gone.
    expect(game.times).toHaveLength(11);
    expect(screen.cancelAnimationFrame).toBe(nativeCancel);
  });

  it("still cancels a handed over callback by its old handle", () => {
    const screen = new FakeScreen(60);
    const limiter = new RafLimiter(screen);
    limiter.setRate(30, 60);
    const ran = vi.fn();
    const handle = screen.requestAnimationFrame(ran);
    limiter.setRate(null);
    screen.cancelAnimationFrame(handle);
    screen.refresh();
    expect(ran).not.toHaveBeenCalled();
    expect(screen.waiting).toBe(0);
  });

  it("passes cancels for handles from before the cap to the browser", () => {
    const screen = new FakeScreen(60);
    const ran = vi.fn();
    const early = screen.requestAnimationFrame(ran);
    new RafLimiter(screen).setRate(30, 60);
    screen.cancelAnimationFrame(early);
    screen.refresh();
    expect(ran).not.toHaveBeenCalled();
  });

  it("switches caps on the fly", () => {
    const screen = new FakeScreen(120);
    const limiter = new RafLimiter(screen);
    limiter.setRate(30, 120);
    const game = loop(screen);
    for (let i = 0; i < 120; i++) screen.refresh();
    expect(game.times).toHaveLength(30);
    limiter.setRate(90);
    expect(limiter.rate).toBe(90);
    for (let i = 0; i < 120; i++) screen.refresh();
    expect(Math.abs(game.times.length - 120)).toBeLessThanOrEqual(1);
  });

  it("skips a callback cancelled by an earlier one in the same frame", () => {
    const screen = new FakeScreen(60);
    new RafLimiter(screen).setRate(30, 60);
    const ran: string[] = [];
    let second = 0;
    screen.requestAnimationFrame(() => {
      ran.push("first");
      screen.cancelAnimationFrame(second);
    });
    second = screen.requestAnimationFrame(() => ran.push("second"));
    for (let i = 0; i < 4; i++) screen.refresh();
    expect(ran).toEqual(["first"]);
  });
});
