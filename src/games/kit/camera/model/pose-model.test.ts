import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand in canvas that remembers whether its WebGL context was freed. */
class FakeCanvas {
  lost = false;
  getContext(type: string) {
    if (type !== "webgl2") return null;
    return { getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext: () => (this.lost = true) } : null) };
  }
}

const made: { canvas: FakeCanvas; delegate: string; closed: boolean }[] = [];
let gpuWorks = true;

vi.mock("./asset-cache", () => ({
  isCached: async () => true,
  fetchCached: async () => ({ bytes: new Uint8Array(4) }),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { isSimdSupported: async () => true },
  PoseLandmarker: {
    createFromOptions: async (_: unknown, options: { canvas: FakeCanvas; baseOptions: { delegate: string } }) => {
      const run = { canvas: options.canvas, delegate: options.baseOptions.delegate, closed: false };
      made.push(run);
      if (run.delegate === "GPU" && !gpuWorks) throw new Error("no GPU");
      return { close: () => (run.closed = true) };
    },
  },
}));

describe("each pose model's WebGL context", () => {
  beforeEach(() => {
    made.length = 0;
    gpuWorks = true;
    vi.stubGlobal("document", { createElement: () => new FakeCanvas() });
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => undefined }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lives on a canvas of our own and is freed when the model closes", async () => {
    const { loadPoseModel } = await import("./pose-model");
    const model = await loadPoseModel({ variant: "lite", delegate: "GPU" });
    expect(made).toHaveLength(1);
    expect(made[0]!.canvas).toBeInstanceOf(FakeCanvas);
    expect(made[0]!.canvas.lost).toBe(false);
    model.close();
    expect(made[0]!.closed).toBe(true);
    expect(made[0]!.canvas.lost).toBe(true);
  });

  it("frees the context of a GPU try that failed, before running on the CPU", async () => {
    gpuWorks = false;
    const { loadPoseModel } = await import("./pose-model");
    const model = await loadPoseModel({ variant: "full", delegate: "GPU" });
    expect(model.delegate).toBe("CPU");
    expect(made.map((m) => m.delegate)).toEqual(["GPU", "CPU"]);
    expect(made[0]!.canvas.lost).toBe(true);
    expect(made[1]!.canvas).not.toBe(made[0]!.canvas);
    expect(made[1]!.canvas.lost).toBe(false);
  });
});
