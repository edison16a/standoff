import { describe, expect, it, vi } from "vitest";
import { startAudioSoon, type ResumableContext } from "./autoplay";

/** A context the test controls: it only starts when `allowed` is true, like a browser before a tap. */
class FakeContext extends EventTarget implements ResumableContext {
  state: AudioContextState = "suspended";
  allowed = false;
  resumes = 0;

  resume(): Promise<void> {
    this.resumes += 1;
    if (!this.allowed) return Promise.reject(new Error("not allowed"));
    this.state = "running";
    this.dispatchEvent(new Event("statechange"));
    return Promise.resolve();
  }
}

describe("startAudioSoon", () => {
  it("starts at once when the browser allows it", () => {
    const ctx = new FakeContext();
    ctx.allowed = true;
    const onRunning = vi.fn();
    startAudioSoon(ctx, new EventTarget(), { onRunning });
    expect(onRunning).toHaveBeenCalledOnce();
  });

  it("tries again on any first interaction, not only keys", () => {
    const ctx = new FakeContext();
    const page = new EventTarget();
    const onRunning = vi.fn();
    startAudioSoon(ctx, page, { onRunning });
    expect(onRunning).not.toHaveBeenCalled();
    page.dispatchEvent(new Event("mousemove"));
    expect(ctx.resumes).toBe(2);
    ctx.allowed = true;
    page.dispatchEvent(new Event("touchend"));
    expect(onRunning).toHaveBeenCalledOnce();
  });

  it("stops listening once running, and when stopped", () => {
    const ctx = new FakeContext();
    const page = new EventTarget();
    const stop = startAudioSoon(ctx, page);
    stop();
    page.dispatchEvent(new Event("pointerdown"));
    expect(ctx.resumes).toBe(1);
  });

  it("skips asking on a mouse move the browser says cannot start sound", () => {
    const activation = { isActive: false, hasBeenActive: false };
    vi.stubGlobal("navigator", { userActivation: activation });
    try {
      const ctx = new FakeContext();
      const page = new EventTarget();
      startAudioSoon(ctx, page);
      page.dispatchEvent(new Event("mousemove"));
      expect(ctx.resumes).toBe(1);
      activation.isActive = true;
      page.dispatchEvent(new Event("pointerdown"));
      expect(ctx.resumes).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses a custom start, such as the engine's unlock", async () => {
    const ctx = new FakeContext();
    const resume = vi.fn(() => Promise.resolve());
    startAudioSoon(ctx, new EventTarget(), { resume });
    expect(resume).toHaveBeenCalledOnce();
  });
});
