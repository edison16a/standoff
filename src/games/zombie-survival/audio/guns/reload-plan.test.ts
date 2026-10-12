import { describe, expect, it } from "vitest";
import { magazineReload, shotCycle, shotgunCloseOut } from "../../ballistics";
import { Gun } from "../../engine/gun";
import { WEAPONS } from "../../engine/weapons";
import { closeOutCues, nextShellCues, reloadCues, shotCues } from "./reload-plan";

const PER_SHELL = WEAPONS.shotgun.shell!;

/** Runs a gun's reload in small steps and lists when each event comes out. */
function runReload(gun: Gun, dt = 1 / 1000): { type: string; at: number }[] {
  const out: { type: string; at: number }[] = [];
  for (let t = 0; t < 6; t += dt) {
    for (const e of gun.update(dt)) out.push({ type: e.type, at: t + dt });
    if (out.some((e) => e.type === "reloaded")) break;
  }
  return out;
}

describe("reload sound plans", () => {
  it("play a magazine reload exactly on the shared timeline", () => {
    for (const weapon of ["smg", "rifle", "ak47"] as const) {
      for (const empty of [false, true]) {
        const seconds = WEAPONS[weapon].reload;
        expect(reloadCues(weapon, seconds, empty, PER_SHELL)).toEqual(magazineReload(weapon, seconds, empty).map(({ step, at }) => ({ cue: step, at })));
      }
    }
  });

  it("finish every magazine step inside the engine's reload", () => {
    const gun = new Gun("rifle");
    gun.ammo = 0;
    gun.startReload();
    const events = runReload(gun);
    const start = events.find((e) => e.type === "reload-start")!;
    const done = events.find((e) => e.type === "reloaded")!;
    for (const { at } of reloadCues("rifle", WEAPONS.rifle.reload, true, PER_SHELL)) expect(at).toBeLessThan(done.at - start.at);
  });

  it("thumb each shotgun shell in a third of a shell before the engine counts it", () => {
    const gun = new Gun("shotgun");
    gun.ammo = 0;
    gun.startReload();
    const shells = runReload(gun).filter((e) => e.type === "shell");
    expect(shells).toHaveLength(WEAPONS.shotgun.magazine);
    const lead = 0.35 * PER_SHELL;

    const opening = reloadCues("shotgun", 0, true, PER_SHELL);
    expect(opening[0]).toEqual({ cue: "lift", at: 0 });
    expect(opening[1]!.cue).toBe("shell-in");
    expect(opening[1]!.at).toBeCloseTo(shells[0]!.at - lead, 2);

    // Each later shell is planned from the one before it.
    for (let i = 1; i < shells.length; i++) {
      const [next] = nextShellCues(PER_SHELL);
      expect(next!.cue).toBe("shell-in");
      expect(shells[i - 1]!.at + next!.at).toBeCloseTo(shells[i]!.at - lead, 2);
    }
  });

  it("rack the pump after a reload from empty", () => {
    expect(closeOutCues()).toEqual(shotgunCloseOut().map(({ step, at }) => ({ cue: step, at })));
  });

  it("rack the pump after every shotgun shot", () => {
    expect(shotCues("shotgun", 3)).toEqual(shotCycle("shotgun").map(({ step, at }) => ({ cue: step, at })));
  });

  it("lock the AR's bolt open on its last round only", () => {
    expect(shotCues("rifle", 0)).toEqual([{ cue: "bolt-lock", at: expect.any(Number) }]);
    expect(shotCues("rifle", 0)[0]!.at).toBeLessThan(0.05);
    expect(shotCues("rifle", 4)).toEqual([]);
    expect(shotCues("ak47", 0)).toEqual([]);
    expect(shotCues("smg", 0)).toEqual([]);
  });
});
