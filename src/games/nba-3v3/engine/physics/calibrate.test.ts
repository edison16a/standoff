import { describe, it } from "vitest";
import { seeded } from "../rng";
import { SPREADS, type Family } from "../shot-calibration";
import { LONG_SPREAD, normal } from "../shot-error";
import { launchFor, type ReleaseInput } from "../shot-release";
import { RIM } from "../tuning";
import type { V3 } from "../vec";
import { traceShot } from "./shot-watch";

/**
 * A tool, off by default: flies thousands of shots with a known spread
 * of release error and prints how often each family drops, as rows for
 * `shot-calibration.ts`. Run it again whenever the ball physics change:
 * NBA_CALIBRATE=1 npx vitest run src/games/nba-3v3/engine/physics/calibrate.test.ts
 */

const SAMPLES = Number(process.env.NBA_CALIBRATE_N ?? 1200);
const jumperApex = (d: number) => RIM.y + 0.95 + d * 0.12;

/** A jumper from `d` metres out on a line 30 degrees off straight on. */
function jumperFrom(d: number): V3 {
  return { x: RIM.x + Math.sin(0.52) * d, y: 2.7, z: RIM.z + Math.cos(0.52) * d };
}

const FAMILIES: Record<Family, ReleaseInput[]> = {
  jumper: [2.4, 4.6, 6.7, 8.5].map((d) => ({ family: "jumper" as const, from: jumperFrom(d), apex: jumperApex(d), spinRate: 15 })),
  free: [{ family: "free", from: { x: 0, y: 2.4, z: 6.05 }, apex: jumperApex(4.475), spinRate: 15 }],
  floater: [{ family: "floater", from: { x: 0.6, y: 2.65, z: 5.0 }, apex: RIM.y + 1.45, spinRate: 5 }],
  layup: [{ family: "layup", from: { x: 0.3, y: 3.0, z: 2.15 }, apex: 3.43, spinRate: 6 }],
  reverse: [{ family: "reverse", from: { x: 0.35, y: 2.95, z: 1.83 }, apex: RIM.y + 0.55, spinRate: 7 }],
  bank: [{ family: "bank", from: { x: 0.42, y: 3.0, z: 1.98 }, apex: 3.43, spinRate: 6 }],
  bankJumper: [{ family: "bankJumper", from: { x: -2.9, y: 2.7, z: 3.4 }, apex: jumperApex(3.5), spinRate: 15 }],
  dunk: [{ family: "dunk", from: { x: 0.05, y: RIM.y + 0.24, z: RIM.z + 0.12 }, apex: RIM.y + 0.24, spinRate: 0 }],
};

function rate(input: ReleaseInput, spread: number, seed: number): number {
  const rng = seeded(seed);
  let made = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const launch = launchFor(input, normal(rng) * spread * LONG_SPREAD, normal(rng) * spread);
    if (traceShot({ pos: { ...input.from }, vel: launch.vel, w: launch.spin }).made) made++;
  }
  return made / SAMPLES;
}

/** A row of rates, made to fall steadily so the lookup can run it backwards. */
function rowFor(input: ReleaseInput): number[] {
  const raw = SPREADS.map((s, i) => rate(input, s, 100 + i));
  for (let i = 1; i < raw.length; i++) raw[i] = Math.min(raw[i]!, raw[i - 1]! - 0.001);
  return raw.map((p) => Math.max(0.001, Math.round(p * 1000) / 1000));
}

describe.skipIf(!process.env.NBA_CALIBRATE)("shot calibration", () => {
  it("prints the table", () => {
    const lines: string[] = [];
    const only = process.env.NBA_CALIBRATE_ONLY;
    for (const [family, inputs] of Object.entries(FAMILIES)) {
      if (only && family !== only) continue;
      const rows = inputs.map((input) => `[${rowFor(input).join(", ")}]`);
      lines.push(family === "jumper" ? `  jumperRows: [\n    ${rows.join(",\n    ")},\n  ],` : `  ${family}: ${rows[0]},`);
    }
    console.log(`CALIBRATION TABLE\n${lines.join("\n")}`);
  }, 3_600_000);
});
