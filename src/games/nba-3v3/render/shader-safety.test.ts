import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * A standing guard against the black streaks. Real graphics cards return
 * NaN for pow or log of a negative and for a divide by zero, where our
 * software renderer returns a number, so these bugs never show in our
 * own browser. Every shader the game draws with, its own and the victory
 * kit's that the ceremony uses, is read as text and checked here.
 */

const RENDER = fileURLToPath(new URL(".", import.meta.url));
const VICTORY = fileURLToPath(new URL("../../kit/victory", import.meta.url));

/** Every source file under `dir`, tests left out. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const FILES = [...sources(RENDER), ...sources(VICTORY)].map((path) => ({ name: relative(join(RENDER, "../../.."), path), text: readFileSync(path, "utf8") }));

/** The first argument of every call to `fn` in a source, with nested brackets kept whole. `Math.pow` and the like are JavaScript and left out. */
function firstArgs(source: string, fn: string): string[] {
  const out: string[] = [];
  const call = new RegExp(`(?<![\\w.$])${fn}\\(`, "g");
  for (let m = call.exec(source); m; m = call.exec(source)) {
    let depth = 0;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === "(") depth++;
      else if (ch === ")" && depth-- === 0) break;
      else if (ch === "," && depth === 0) break;
    }
    out.push(source.slice(start, i).trim());
  }
  return out;
}

/** A base that cannot go negative: clamped, or a plain number. */
const guarded = (base: string) => /^(max|clamp|abs|saturate)\s*\(/.test(base) || /^\d+(\.\d*)?$/.test(base);

describe("shader safety scan", () => {
  it("finds every first argument, nested calls and all, and skips JavaScript", () => {
    expect(firstArgs("a = pow(max(x, 0.0), 2.0) + pow(y, 3.0) + Math.pow(z, 2);", "pow")).toEqual(["max(x, 0.0)", "y"]);
    expect(firstArgs("log(f(a, b))", "log")).toEqual(["f(a, b)"]);
  });

  it("reads the game's shaders and the victory kit's", () => {
    const names = FILES.map((f) => f.name);
    expect(names).toContain("games/nba-3v3/render/post/grade.ts");
    expect(names).toContain("games/kit/victory/lights/beam.ts");
    expect(FILES.filter((f) => firstArgs(f.text, "pow").length > 0).length).toBeGreaterThan(3);
  });

  it("never takes pow of a value that can dip under zero", () => {
    for (const file of FILES) for (const base of firstArgs(file.text, "pow")) expect(guarded(base), `${file.name}: pow(${base}, ...)`).toBe(true);
  });

  it("never takes a log of a value that can reach zero or below", () => {
    for (const file of FILES) for (const fn of ["log", "log2"]) for (const arg of firstArgs(file.text, fn)) expect(/^(max|clamp)\s*\(/.test(arg), `${file.name}: ${fn}(${arg})`).toBe(true);
  });

  it("never sizes a point by dividing by a depth that can be zero", () => {
    for (const file of FILES) {
      for (const line of file.text.split("\n")) {
        if (!/gl_PointSize\s*=/.test(line) || !line.includes("/")) continue;
        expect(line.split("/").slice(1).join("/"), `${file.name}: ${line.trim()}`).toMatch(/^\s*max\(/);
      }
    }
  });
});

describe("the finish's safety net", () => {
  const text = (name: string) => FILES.find((f) => f.name === `games/nba-3v3/render/${name}`)!.text;

  it("cleans every tap where the bloom first reads the scene", () => {
    expect(text("post/bloom.ts")).toMatch(/vec3 tap\(vec2 o\) \{ return finite\(texture2D\(tInput/);
  });

  it("skips bad taps in the depth of field and never divides depth by zero", () => {
    const dof = text("post/depth-of-field.ts");
    expect(dof).toMatch(/if \(nonFinite\(tap\)\) w = 0\.0;/);
    expect(dof).toMatch(/max\(uFar - clamp\(d, 0\.0, 1\.0\)/);
    expect(dof).toMatch(/sum \/ max\(total,/);
  });

  it("fills a bad pixel in the final composite, with or without depth of field", () => {
    const grade = text("post/grade.ts");
    expect(grade).toMatch(/hole && uDof <= 0\.001 \? fill\(\) : finite\(raw\)/);
    for (const input of ["tBloom", "tDof"]) expect(grade).toMatch(new RegExp(`finite\\(texture2D\\(${input}`));
  });

  it("cleans the floor's mirror before it is used, and caps the floor's light", () => {
    const floor = text("arena/floor.ts");
    expect(floor).toMatch(/finite\(seen\.rgb\)/);
    expect(floor).toMatch(/capLight\(shader\)/);
  });
});
