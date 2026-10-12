import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WEAPON_IDS } from "../../engine/weapons";
import { CASE_SAMPLES, DRY_SAMPLES, SAMPLE_NAMES, sampleUrl, SFX_ROOT, SHOT_SAMPLES, STEP_SAMPLES } from "./manifest";
import { leadIn } from "./sample-bank";

const publicDir = fileURLToPath(new URL("../../../../../public", import.meta.url));
const sfxDir = `${publicDir}${SFX_ROOT}`;
const credits = readFileSync(`${sfxDir}CREDITS.md`, "utf8");

describe("the gun recordings", () => {
  it("are all on disk where the game fetches them", () => {
    for (const name of SAMPLE_NAMES) expect(statSync(`${publicDir}${sampleUrl(name)}`).size, name).toBeGreaterThan(1000);
  });

  it("each have a CC0 line in the credits, tracing back to a Freesound page", () => {
    const rows = credits.split("\n").filter((line) => line.startsWith("| ") && line.includes(".mp3"));
    for (const name of SAMPLE_NAMES) {
      const index = rows.findIndex((row) => row.startsWith(`| ${name}.mp3 |`));
      expect(index, name).toBeGreaterThanOrEqual(0);
      expect(rows[index], name).toContain("CC0 1.0");
      // "same as above" points at the nearest row before it that names its source.
      const source = rows.slice(0, index + 1).reverse().find((row) => row.includes("https://freesound.org/people/"));
      expect(source, name).toBeDefined();
    }
  });

  it("leave nothing in the folder the game does not use", () => {
    const files = readdirSync(sfxDir).filter((f) => f.endsWith(".mp3"));
    expect(files.sort()).toEqual(SAMPLE_NAMES.map((n) => `${n}.mp3`).sort());
  });

  it("stay small enough to load at the start of a game", () => {
    const bytes = SAMPLE_NAMES.reduce((sum, name) => sum + statSync(`${publicDir}${sampleUrl(name)}`).size, 0);
    expect(bytes).toBeLessThan(1.5 * 1024 * 1024);
  });

  it("give every gun a shot, and only name recordings that exist", () => {
    const known = new Set<string>(SAMPLE_NAMES);
    for (const weapon of WEAPON_IDS) {
      expect(SHOT_SAMPLES[weapon].length).toBeGreaterThan(0);
      for (const names of [SHOT_SAMPLES[weapon], ...Object.values(STEP_SAMPLES[weapon])]) for (const n of names ?? []) expect(known.has(n), n).toBe(true);
    }
    for (const n of [...DRY_SAMPLES, ...Object.values(CASE_SAMPLES).flat()]) expect(known.has(n), n).toBe(true);
  });
});

describe("leadIn", () => {
  it("skips the decoder's silent start, keeping a couple of milliseconds before the sound", () => {
    const rate = 1000;
    const data = new Float32Array(100);
    data[40] = 0.5;
    expect(leadIn(data, rate)).toBeCloseTo(0.038, 6);
    expect(leadIn(new Float32Array(10), rate)).toBe(0);
  });
});
