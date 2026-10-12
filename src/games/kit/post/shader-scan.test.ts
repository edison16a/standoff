import { describe, expect, it } from "vitest";
import { firstArgs, shaderSources, unsafeMath } from "./shader-scan";

describe("shader scan", () => {
  it("finds every first argument, nested calls and all, and skips JavaScript", () => {
    expect(firstArgs("a = pow(max(x, 0.0), 2.0) + pow(y, 3.0) + Math.pow(z, 2);", "pow")).toEqual(["max(x, 0.0)", "y"]);
    expect(firstArgs("log(f(a, b))", "log")).toEqual(["f(a, b)"]);
  });

  it("reports each kind of risky maths, and passes the guarded forms", () => {
    const bad = { name: "bad.ts", text: "pow(x, 2.0); log(y); normalize(v); gl_PointSize = s / -mv.z;" };
    const good = { name: "good.ts", text: "pow(max(x, 0.0), 2.0); pow(2.0, x); log(max(y, 1e-6)); normalize(vec3(0.0, 1.0, 0.0)); normalize(n); gl_PointSize = s / max(-mv.z, 0.01);" };
    expect(unsafeMath([bad])).toHaveLength(4);
    expect(unsafeMath([good], { "good.ts: n": "a test" })).toEqual([]);
  });

  it("never passes a zero vector written out", () => {
    expect(unsafeMath([{ name: "z.ts", text: "normalize(vec3(0.0, 0.0, 0.0))" }])).toHaveLength(1);
  });

  // The victory kit's spotlights and confetti draw in every game's trophy ceremony.
  it("finds nothing risky in the kit's own shaders", () => {
    const files = shaderSources("kit/victory", "kit/post");
    expect(files.map((f) => f.name)).toContain("kit/victory/lights/beam.ts");
    expect(
      unsafeMath(files, {
        "kit/victory/lights/beam.ts: normalMatrix * normal": "a mesh normal is unit length before the matrix",
        "kit/victory/lights/beam.ts: -world.xyz": "zero only at the camera itself, which a beam never touches",
      }),
    ).toEqual([]);
  });
});
