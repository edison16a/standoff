import { describe, expect, it } from "vitest";
import { loadMemory, saveMemory, type ControllerMemory, type MemoryStore } from "./controller-memory";

function mapStore(): MemoryStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const SAVED: ControllerMemory = { step: "ready", steerMode: "tilt", calibrated: true, zero: 0.12, wanted: "nova" };

describe("the controller memory", () => {
  it("gives back what was saved for the same room and seat", () => {
    const store = mapStore();
    saveMemory("ABCD", 2, SAVED, store);
    expect(loadMemory("ABCD", 2, store)).toEqual(SAVED);
  });

  it("keeps rooms and seats apart", () => {
    const store = mapStore();
    saveMemory("ABCD", 2, SAVED, store);
    expect(loadMemory("ABCD", 1, store)).toBeNull();
    expect(loadMemory("WXYZ", 2, store)).toBeNull();
  });

  it("ignores anything broken or from an older shape", () => {
    const store = mapStore();
    store.data.set("standoff:magic-kart:ABCD:1", "{not json");
    store.data.set("standoff:magic-kart:ABCD:2", JSON.stringify({ ...SAVED, wanted: "bowser" }));
    expect(loadMemory("ABCD", 1, store)).toBeNull();
    expect(loadMemory("ABCD", 2, store)).toBeNull();
  });

  it("carries on when storage throws", () => {
    const store: MemoryStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(() => saveMemory("ABCD", 1, SAVED, store)).not.toThrow();
    expect(loadMemory("ABCD", 1, store)).toBeNull();
  });
});
