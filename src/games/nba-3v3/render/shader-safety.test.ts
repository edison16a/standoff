import { describe, expect, it } from "vitest";
import { shaderSources, unsafeMath } from "@/games/kit/post/shader-scan";

/**
 * A standing guard against the black streaks. Every shader the game
 * draws with is read as text and scanned for maths that gives NaN on a
 * real graphics card (the kit's own test covers the victory kit), and
 * each pass of the finish is checked for its clean up.
 */

const FILES = shaderSources("nba-3v3/render");
const text = (name: string) => FILES.find((f) => f.name === `nba-3v3/render/${name}`)!.text;

/** Each normalize checked by hand, and why its vector is never zero. */
const REVIEWED = {
  "nba-3v3/render/materials/micro-detail.ts: dx": "returns early when the screen derivative is under 1e-30",
  "nba-3v3/render/materials/micro-detail.ts: dy": "returns early when the screen derivative is under 1e-30",
  "nba-3v3/render/materials/micro-detail.ts: n": "guarded by the length check on the same line",
  "nba-3v3/render/arena/floor.ts: vec3(-hx * 0.35, 1.0, -hz * 0.35)": "the up component is always 1",
  "nba-3v3/render/arena/floor.ts: (viewMatrix * vec4(floorNormal, 0.0)).xyz": "a rotation of a unit vector",
  "nba-3v3/render/arena/floor.ts: vViewPosition": "zero only at the camera, which never sits on the floor",
  "nba-3v3/render/arena/roof.ts: mat3(modelMatrix) * normal": "the beams are only moved and turned, never squashed flat",
  "nba-3v3/render/arena/roof.ts: cameraPosition - world.xyz": "zero only with the camera on a beam vertex up in the roof",
};

describe("shader safety scan", () => {
  it("reads the game's shaders", () => {
    expect(FILES.map((f) => f.name)).toContain("nba-3v3/render/post/grade.ts");
  });

  it("finds no pow, log, normalize or point size that can give NaN", () => {
    expect(unsafeMath(FILES, REVIEWED)).toEqual([]);
  });
});

describe("the finish's safety net", () => {
  it("cleans every tap where the bloom first reads the scene", () => {
    expect(text("post/bloom.ts")).toMatch(/vec3 tap\(vec2 o\) \{ return finite\(texture2D\(tInput/);
  });

  it("skips bad taps in the depth of field, with the kit's guarded depth", () => {
    const dof = text("post/depth-of-field.ts");
    expect(dof).toMatch(/if \(nonFinite\(tap\)\) w = 0\.0;/);
    expect(dof).toMatch(/\$\{VIEW_DEPTH\}/);
    expect(dof).toMatch(/sum \/ max\(total,/);
  });

  it("fills a bad pixel in the final composite, with or without depth of field", () => {
    const grade = text("post/grade.ts");
    expect(grade).toMatch(/hole && uDof <= 0\.001 \? fillHole\(tScene, vUv, uTexel\) : finite\(raw\)/);
    for (const input of ["tBloom", "tDof"]) expect(grade).toMatch(new RegExp(`finite\\(texture2D\\(${input}`));
  });

  it("cleans the floor's mirror before it is used, and caps the floor's light", () => {
    const floor = text("arena/floor.ts");
    expect(floor).toMatch(/finite\(seen\.rgb\)/);
    expect(floor).toMatch(/capLight\(shader\)/);
  });
});
