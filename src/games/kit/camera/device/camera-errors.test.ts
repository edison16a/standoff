import { describe, expect, it } from "vitest";
import { CameraError, cameraProblemOf, PROBLEM_TEXT } from "./camera-errors";

const named = (name: string) => Object.assign(new Error("x"), { name });

describe("sorting camera failures", () => {
  it("tells a blocked camera from a missing or busy one, across browsers", () => {
    expect(cameraProblemOf(named("NotAllowedError"))).toBe("denied");
    expect(cameraProblemOf(named("PermissionDeniedError"))).toBe("denied");
    expect(cameraProblemOf(named("NotFoundError"))).toBe("no-camera");
    expect(cameraProblemOf(named("OverconstrainedError"))).toBe("no-camera");
    expect(cameraProblemOf(named("NotReadableError"))).toBe("busy");
    expect(cameraProblemOf(named("TrackStartError"))).toBe("busy");
  });

  it("keeps the kit's own problems and calls anything else a failure", () => {
    expect(cameraProblemOf(new CameraError("insecure"))).toBe("insecure");
    expect(cameraProblemOf(named("TypeError"))).toBe("failed");
    expect(cameraProblemOf("nonsense")).toBe("failed");
  });

  it("has plain advice for every problem", () => {
    for (const text of Object.values(PROBLEM_TEXT)) {
      expect(text.title.length).toBeGreaterThan(5);
      expect(text.advice).toMatch(/\.$/);
      expect(text.advice).not.toMatch(/--|\u2014/);
    }
  });
});
