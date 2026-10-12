import { describe, expect, it } from "vitest";
import { beamMaterial } from "@/games/kit/victory/lights/beam";
import { BEAM_FRAGMENT } from "./roof";

/** The first argument of every pow call in a shader, with nested brackets kept whole. */
function powBases(source: string): string[] {
  const out: string[] = [];
  for (let at = source.indexOf("pow("); at >= 0; at = source.indexOf("pow(", at + 4)) {
    let depth = 0;
    let i = at + 4;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) break;
    }
    out.push(source.slice(at + 4, i).trim());
  }
  return out;
}

/** A base that cannot go negative: pow of a negative is NaN on most graphics cards. */
const guarded = (base: string) => /^(max|clamp|abs)\(/.test(base);

describe("haze beams", () => {
  it("finds every pow base, nested calls and all", () => {
    expect(powBases("a = pow(max(x, 0.0), 2.0) + pow(y, 3.0);")).toEqual(["max(x, 0.0)", "y"]);
  });

  it("never take pow of a value that can dip under zero, on the roof's beams", () => {
    const bases = powBases(BEAM_FRAGMENT);
    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) expect(guarded(base), base).toBe(true);
  });

  it("never take pow of a value that can dip under zero, on the ceremony's spotlights", () => {
    const material = beamMaterial("#ffffff");
    const bases = powBases(material.fragmentShader);
    material.dispose();
    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) expect(guarded(base), base).toBe(true);
  });
});
