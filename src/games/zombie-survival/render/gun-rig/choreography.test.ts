import { describe, expect, it } from "vitest";
import type { ActionStep } from "../../ballistics";
import { WEAPONS } from "../../engine/weapons";
import { reloadLength, reloadPose, reloadSteps } from "./choreography";
import type { GunPose } from "./pose";
import { restPose } from "./rest";

type MagGun = "rifle" | "ak47" | "smg";
const MAG_GUNS: MagGun[] = ["rifle", "ak47", "smg"];

/** One reload, posed at any moment, with its step times to hand. */
function reload(weapon: MagGun, empty: boolean) {
  const seconds = WEAPONS[weapon].reload;
  const steps = reloadSteps(weapon, seconds, empty);
  const at = (step: ActionStep) => steps.find((s) => s.step === step)?.at ?? NaN;
  const pose = (t: number): GunPose => reloadPose(weapon, restPose(weapon), { t, seconds, empty, steps, inward: 1 });
  return { seconds, steps, at, pose };
}

describe("magazine reloads", () => {
  for (const weapon of MAG_GUNS) {
    for (const empty of [false, true]) {
      describe(`${weapon}${empty ? " from empty" : ""}`, () => {
        const { seconds, at, pose } = reload(weapon, empty);

        it("has the magazine out of the well between mag-out and mag-in", () => {
          const out = at("mag-out");
          const into = at("mag-in");
          for (let t = out + 0.12; t < into; t += 0.05) {
            const p = pose(t);
            expect(p.mag.shown, `gun magazine at ${t}`).toBe(0);
            // Any fresh magazine on show is still on its way up, clear of the well,
            // or on the AK hooked on its front lug but still tipped forward.
            if (p.spare.shown) expect(p.spare.pos[1] < -0.02 || p.spare.rot[0] > 0.3, `fresh magazine at ${t}`).toBe(true);
          }
        });

        it("lets the empty magazine go after mag-out, and not before", () => {
          expect(pose(at("mag-release")).dropped).toBe(false);
          expect(pose(at("mag-out") + 0.15).dropped).toBe(true);
        });

        it("has the fresh magazine home and locked at mag-seat", () => {
          const p = pose(at("mag-seat"));
          expect(p.mag.shown).toBe(1);
          expect(p.mag.pos).toEqual([0, 0, 0]);
          expect(p.mag.rot).toEqual([0, 0, 0]);
          expect(p.spare.shown).toBe(0);
        });

        it("lifts the gun to show the work and brings it back to the held pose at the end", () => {
          const mid = pose(at("mag-in"));
          expect(Math.abs(mid.body.rot[2])).toBeGreaterThan(0.3);
          const end = pose(seconds);
          const rest = restPose(weapon);
          end.body.rot.forEach((v) => expect(v).toBeCloseTo(0, 3));
          end.support.pos.forEach((v, i) => expect(v).toBeCloseTo(rest.support.pos[i]!, 3));
          end.grip.pos.forEach((v, i) => expect(v).toBeCloseTo(rest.grip.pos[i]!, 3));
        });

        it("takes the support hand off the gun while the magazine is out", () => {
          const rest = restPose(weapon).support.pos;
          const away = pose((at("mag-out") + at("mag-in")) / 2).support.pos;
          expect(Math.hypot(away[0] - rest[0], away[1] - rest[1], away[2] - rest[2])).toBeGreaterThan(0.1);
        });
      });
    }
  }
});

describe("bolt work", () => {
  it("racks the AK's handle from empty: back at bolt-back, home after bolt-forward", () => {
    const { at, pose } = reload("ak47", true);
    expect(pose(at("bolt-back")).handle).toBeCloseTo(1, 3);
    expect(pose(at("bolt-back")).carrier).toBeCloseTo(1, 3);
    expect(pose(at("bolt-forward")).handle).toBeCloseTo(0, 3);
    // The right hand left the grip to do it.
    const grip = restPose("ak47").grip.pos;
    expect(pose(at("bolt-back")).grip.pos[1]).toBeGreaterThan(grip[1] + 0.05);
  });

  it("leaves the AK's handle alone with rounds left", () => {
    const { seconds, pose } = reload("ak47", false);
    for (let t = 0; t < seconds; t += 0.05) expect(pose(t).handle).toBe(0);
  });

  it("locks the MP5's handle back and up first, then slaps it home", () => {
    const { at, pose } = reload("smg", true);
    expect(pose(at("bolt-back")).handle).toBeCloseTo(1, 3);
    const locked = pose(at("mag-in"));
    expect(locked.handle).toBe(1);
    expect(locked.handleLock).toBe(1);
    const slapped = pose(at("bolt-forward"));
    expect(slapped.handle).toBeCloseTo(0, 3);
    expect(slapped.handleLock).toBeCloseTo(0, 3);
  });

  it("holds the AR's bolt open from empty until the catch is struck", () => {
    const { at, pose } = reload("rifle", true);
    expect(pose(at("mag-in")).carrier).toBe(1);
    expect(pose(at("bolt-catch") - 0.01).carrier).toBe(1);
    expect(pose(at("bolt-catch") + 0.05).carrier).toBe(0);
  });

  it("does no bolt work on an AR with rounds left", () => {
    const { seconds, pose } = reload("rifle", false);
    for (let t = 0; t < seconds; t += 0.05) expect(pose(t).carrier).toBe(0);
  });

  it("jolts the gun as the magazine is slapped home", () => {
    const { at, pose } = reload("rifle", false);
    const before = pose(at("mag-seat") - 0.005).body.rot[0];
    const after = pose(at("mag-seat") + 0.03).body.rot[0];
    expect(after).toBeGreaterThan(before + 0.01);
  });
});

describe("reload length", () => {
  it("matches the engine for a magazine and runs past the last shell for the pump gun", () => {
    expect(reloadLength("rifle", 2, true)).toBe(2);
    expect(reloadLength("shotgun", 0.35 + 3 * 0.36, true)).toBeGreaterThan(0.35 + 3 * 0.36);
  });
});
