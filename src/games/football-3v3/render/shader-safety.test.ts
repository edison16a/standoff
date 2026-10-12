import { describe, expect, it } from "vitest";
import { shaderSources, unsafeMath } from "@/games/kit/post/shader-scan";
import { easeLook, LIVE_LOOK, REPLAY_LOOK } from "./post/look";

/**
 * A standing guard against black streaks in the replays and the
 * ceremony. Every shader the game draws with is scanned for maths that
 * gives NaN on a real graphics card, and each pass of the finish is
 * checked for its clean up.
 */

const FILES = shaderSources("football-3v3/render");
const text = (name: string) => FILES.find((f) => f.name === `football-3v3/render/${name}`)!.text;

/** Each normalize checked by hand, and why its vector is never zero. */
const REVIEWED = {
  "football-3v3/render/lighting/stadium-env.ts: position": "a point on the environment sphere, never its centre",
  "football-3v3/render/materials/gloss-env.ts: position": "a point on the environment sphere, never its centre",
  "football-3v3/render/field/sky.ts: position": "a point on the sky dome, never its centre",
  "football-3v3/render/field/sky.ts: vDir": "directions across one face of the dome, all on the same side",
  "football-3v3/render/field/turf.ts: vec3(p.x, 0.0, p.y) - eye": "the camera is always above the turf",
  "football-3v3/render/field/turf.ts: normal + mat3(viewMatrix) * vec3(tilt.x, 0.0, tilt.y) * 0.35 * near * (1.0 - paint.a * 0.7)": "a unit normal plus a small tilt",
  "football-3v3/render/field/glare.ts: cameraPosition - aCentre": "the floodlight banks are far from every camera",
};

describe("shader safety scan", () => {
  it("reads the game's shaders", () => {
    expect(FILES.map((f) => f.name)).toContain("football-3v3/render/post/grade.ts");
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
    expect(grade).toMatch(/finite\(texture2D\(tBloom/);
    expect(grade).toMatch(/pow\(max\(c, vec3\(0\.0\)\)/);
  });

  // One NaN in the look would reach the grade every frame after it and draw the whole picture black.
  it("ignores a NaN step when easing the look", () => {
    const look = { ...LIVE_LOOK };
    easeLook(look, REPLAY_LOOK, Number.NaN, 4);
    expect(look).toEqual(LIVE_LOOK);
  });
});
