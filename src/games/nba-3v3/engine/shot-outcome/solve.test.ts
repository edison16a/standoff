import { describe, expect, it } from "vitest";
import { seeded } from "../rng";
import type { ReleaseInput } from "../shot-release";
import { RIM } from "../tuning";
import { PRESETS, isMakePreset, type ShotPreset } from "./presets";
import { solvePreset } from "./solve";

const apex = (d: number) => RIM.y + 0.95 + d * 0.12;
const from = (d: number, angle: number) => ({ x: RIM.x + Math.sin(angle) * d, y: 2.7, z: RIM.z + Math.cos(angle) * d });

/** A wing jumper, a three, a free throw and a layup, as a game throws them. */
const SPOTS: Record<string, ReleaseInput> = {
  wing: { family: "jumper", from: from(4.6, 0.6), apex: apex(4.6), spinRate: 15 },
  three: { family: "jumper", from: from(7.2, -0.9), apex: apex(7.2), spinRate: 15 },
  free: { family: "free", from: { x: 0, y: 2.4, z: 6.05 }, apex: apex(4.475), spinRate: 15 },
  layup: { family: "layup", from: { x: 0.3, y: 3.0, z: 2.15 }, apex: 3.43, spinRate: 6 },
};

/** Endings a spot cannot really give: no glass straight on, no long rebound off a soft layup, few rattles from deep. */
const SKIP: Record<string, ShotPreset[]> = { free: ["bank"], layup: ["backIron"], three: ["rattleIn"], wing: [] };

describe("the shot ending solver", () => {
  it("finds a real flight for each ending from each spot", () => {
    for (const [name, input] of Object.entries(SPOTS)) {
      for (const want of PRESETS) {
        if (SKIP[name]!.includes(want)) continue;
        let hit = 0;
        for (let seed = 1; seed <= 5; seed++) if (solvePreset(seeded(seed * 17), input, want).preset === want) hit++;
        expect(hit, `${want} from ${name}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("always keeps the make or the miss it was asked for", () => {
    for (const input of Object.values(SPOTS)) {
      for (const want of PRESETS) {
        const shot = solvePreset(seeded(3), input, want);
        expect(shot.detail.made, want).toBe(isMakePreset(want));
      }
    }
  });

  it("gives the same flight for the same seed", () => {
    const a = solvePreset(seeded(9), SPOTS.wing!, "rattleIn");
    const b = solvePreset(seeded(9), SPOTS.wing!, "rattleIn");
    expect(b.launch.vel).toEqual(a.launch.vel);
    expect(b.launch.spin).toEqual(a.launch.spin);
  });

  it("spins a jumper backward about two and a half turns a second and arcs it in from above", () => {
    const shot = solvePreset(seeded(4), SPOTS.three!, "swish");
    const turns = Math.hypot(shot.launch.spin.x, shot.launch.spin.z) / (Math.PI * 2);
    expect(turns).toBeGreaterThan(2);
    expect(turns).toBeLessThan(3);
    // Launched upward at more than 45 degrees, so the ball drops into the ring rather than at it.
    const v = shot.launch.vel;
    expect(Math.atan2(v.y, Math.hypot(v.x, v.z))).toBeGreaterThan(Math.PI / 4);
  });
});
