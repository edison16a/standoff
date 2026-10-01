import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loads = vi.hoisted(() => ({ results: [] as ("fail" | "ok")[] }));
vi.mock("@/games/catalog", () => ({
  loadGame: (id: string) =>
    id === "unknown" ? undefined : loads.results.shift() === "ok" ? Promise.resolve({ createHost: () => null }) : Promise.reject(new Error("chunk")),
}));

const { loadWithRetry, LOAD_RETRY_MS } = await import("./load-with-retry");

describe("loadWithRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("tries a failed download once more after a moment", async () => {
    loads.results = ["fail", "ok"];
    const loading = loadWithRetry("tiny");
    await vi.advanceTimersByTimeAsync(LOAD_RETRY_MS);
    await expect(loading).resolves.toBeDefined();
  });

  it("gives up after the second failure, so the screen can offer a reload", async () => {
    loads.results = ["fail", "fail"];
    const loading = loadWithRetry("tiny");
    const settled = expect(loading).rejects.toThrow("chunk");
    await vi.advanceTimersByTimeAsync(LOAD_RETRY_MS);
    await settled;
  });

  it("fails at once for a game this build does not know", async () => {
    await expect(loadWithRetry("unknown")).rejects.toThrow("Unknown game unknown");
  });
});
