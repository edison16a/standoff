import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * For tests only (it reads files): a scan of a game's shader sources for
 * the maths that gives NaN on a real graphics card but a number in
 * software drawing, so the bug never shows in our own browser. One NaN
 * pixel is spread by a finish's bloom and depth of field into a thick
 * black streak.
 */

/** The games folder; file names in the scan are relative to it, like `nba-3v3/render/post/grade.ts`. */
const GAMES = fileURLToPath(new URL("../..", import.meta.url));

export interface Source {
  name: string;
  text: string;
}

/** Every source file under each folder (relative to the games folder), tests and this scanner left out. */
export function shaderSources(...folders: string[]): Source[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return walk(path);
      return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && entry !== "shader-scan.ts" ? [path] : [];
    });
  return folders.flatMap((folder) => walk(join(GAMES, folder))).map((path) => ({ name: relative(GAMES, path), text: readFileSync(path, "utf8") }));
}

/** The first argument of every call to `fn`, with nested brackets kept whole. `Math.pow` and the like are JavaScript and left out. */
export function firstArgs(source: string, fn: string): string[] {
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

/** A pow base that cannot go negative: clamped, or a plain number. */
const clampedBase = (base: string) => /^(max|clamp|abs|saturate)\s*\(/.test(base) || /^\d+(\.\d*)?$/.test(base);
/** A vector of plain numbers, which is never zero length unless written so. */
const constantVector = (arg: string) => /^vec[234]\([-\d.,\s]+\)$/.test(arg) && /[1-9]/.test(arg.slice(5));

/**
 * Everything risky the scan finds, one line each. `reviewed` lists the
 * normalize calls a person has checked can never be of a zero vector, as
 * `"file: argument"` with the reason; any other normalize is reported,
 * so a new one is looked at before it ships.
 */
export function unsafeMath(files: readonly Source[], reviewed: Readonly<Record<string, string>> = {}): string[] {
  const found: string[] = [];
  for (const { name, text } of files) {
    for (const base of firstArgs(text, "pow")) if (!clampedBase(base)) found.push(`${name}: pow(${base}, ...) can take a negative base`);
    for (const fn of ["log", "log2"]) for (const arg of firstArgs(text, fn)) if (!/^(max|clamp)\s*\(/.test(arg)) found.push(`${name}: ${fn}(${arg}) can reach zero or below`);
    for (const arg of firstArgs(text, "normalize")) if (!constantVector(arg) && !reviewed[`${name}: ${arg}`]) found.push(`${name}: normalize(${arg}) is not reviewed`);
    for (const line of text.split("\n")) {
      if (!/gl_PointSize\s*=/.test(line) || !line.includes("/")) continue;
      if (!/^\s*max\(/.test(line.split("/").slice(1).join("/"))) found.push(`${name}: ${line.trim()} divides by a depth that can be zero`);
    }
  }
  return found;
}
