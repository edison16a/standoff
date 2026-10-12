import { describe, expect, it } from "vitest";
import { shaderSources, unsafeMath } from "@/games/kit/post/shader-scan";
import { BROADCAST_LOOK, easeLook, REPLAY_LOOK } from "./post/look";

/**
 * A standing guard against black streaks in the replays and the
 * ceremony. Every shader the game draws with is scanned for maths that
 * gives NaN on a real graphics card, and each pass of the finish is
 * checked for its clean up.
 */

const FILES = shaderSources("fifa-3v3/render");
const text = (name: string) => FILES.find((f) => f.name === `fifa-3v3/render/${name}`)!.text;

/** Each normalize checked by hand, and why its vector is never zero. */
const REVIEWED = {
  "fifa-3v3/render/arena/turf-material.ts: cameraPosition - vTurf": "the camera is always above the turf",
  "fifa-3v3/render/arena/sky.ts: vDir": "directions across one face of the sky dome, all on the same side",
};

describe("shader safety scan", () => {
  it("reads the game's shaders", () => {
    expect(FILES.map((f) => f.name)).toContain("fifa-3v3/render/post/grade.ts");
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
    expect(grade).toMatch(/pow\(max\(c, vec3\(0\.0\)\)/);
  });

  // One NaN in the look would reach the grade every frame after it and draw the whole picture black.
  it("ignores a NaN step when easing the look", () => {
    const look = { ...BROADCAST_LOOK };
    easeLook(look, REPLAY_LOOK, Number.NaN, 4);
    expect(look).toEqual(BROADCAST_LOOK);
  });
});
