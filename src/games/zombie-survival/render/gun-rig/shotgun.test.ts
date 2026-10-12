import { describe, expect, it } from "vitest";
import { SHOTGUN_LIFT, shotCycle } from "../../ballistics";
import { WEAPONS } from "../../engine/weapons";
import { reloadPose, reloadSteps, shellCount } from "./choreography";
import { ReloadPlayer } from "./reload-player";
import { restPose } from "./rest";
import { shotLayer } from "./shot-cycle";

const PER_SHELL = WEAPONS.shotgun.shell!;
const seconds = (shells: number) => SHOTGUN_LIFT + shells * PER_SHELL;

function shotgun(shells: number, empty: boolean) {
  const steps = reloadSteps("shotgun", seconds(shells), empty);
  const pose = (t: number) => reloadPose("shotgun", restPose("shotgun"), { t, seconds: seconds(shells), empty, steps, inward: -1 });
  return { steps, pose };
}

describe("the shotgun's reload", () => {
  it("lays out one shell-in per shell the engine will count", () => {
    expect(shellCount(seconds(5))).toBe(5);
    const { steps } = shotgun(5, false);
    const pushes = steps.filter((s) => s.step === "shell-in").map((s) => s.at);
    expect(pushes).toHaveLength(5);
    // Each push lands a little before the engine counts that shell.
    pushes.forEach((at, i) => {
      expect(at).toBeLessThan(seconds(i + 1));
      expect(at).toBeGreaterThan(seconds(i + 1) - PER_SHELL);
    });
  });

  it("brings a shell to the port for every push and thumbs it in", () => {
    const { steps, pose } = shotgun(3, false);
    for (const push of steps.filter((s) => s.step === "shell-in")) {
      const before = pose(push.at - 0.06);
      const after = pose(push.at + 0.05);
      expect(before.shell.shown).toBe(1);
      // Up and forward, into the tube under the barrel.
      expect(after.shell.pos[1]).toBeGreaterThan(before.shell.pos[1]);
      expect(after.shell.pos[2]).toBeLessThan(before.shell.pos[2]);
      expect(pose(push.at + 0.1).shell.shown).toBe(0);
    }
  });

  it("racks the pump after the last shell when it began empty, and not otherwise", () => {
    const dry = shotgun(8, true);
    const back = dry.steps.find((s) => s.step === "pump-back")!.at;
    const forward = dry.steps.find((s) => s.step === "pump-forward")!.at;
    expect(dry.pose(back).pump).toBeCloseTo(1, 3);
    expect(dry.pose(forward).pump).toBeCloseTo(0, 3);
    expect(dry.steps.some((s) => s.step === "pump-back")).toBe(true);
    const topUp = shotgun(3, false);
    expect(topUp.steps.some((s) => s.step === "pump-back")).toBe(false);
  });
});

describe("the shot cycle", () => {
  const fresh = { since: 10, left: 5, sinceFirst: -1 };

  it("shows an automatic's carrier back on the shot frame and home a moment later", () => {
    for (const weapon of ["rifle", "ak47", "smg"] as const) {
      expect(shotLayer(weapon, restPose(weapon), { ...fresh, since: 0.005 }).carrier).toBe(1);
      expect(shotLayer(weapon, restPose(weapon), { ...fresh, since: 0.1 }).carrier).toBe(0);
    }
  });

  it("rides the AK's handle on its carrier, but not the other handles", () => {
    expect(shotLayer("ak47", restPose("ak47"), { ...fresh, since: 0 }).handle).toBe(1);
    expect(shotLayer("smg", restPose("smg"), { ...fresh, since: 0 }).handle).toBe(0);
  });

  it("locks the AR's bolt back on the last round", () => {
    const pose = shotLayer("rifle", restPose("rifle"), { since: 2, left: 0, sinceFirst: 2 });
    expect(pose.carrier).toBe(1);
    expect(pose.cover).toBe(1);
    expect(shotLayer("ak47", restPose("ak47"), { since: 2, left: 0, sinceFirst: 2 }).carrier).toBe(0);
  });

  it("racks the pump at the shot cycle's times, the hand riding the fore end", () => {
    const steps = shotCycle("shotgun");
    const back = steps.find((s) => s.step === "pump-back")!.at;
    const forward = steps.find((s) => s.step === "pump-forward")!.at;
    const rest = restPose("shotgun");
    const racked = shotLayer("shotgun", rest, { ...fresh, since: back });
    expect(racked.pump).toBe(1);
    expect(racked.carrier).toBe(1);
    expect(racked.support.pos[2]).toBeGreaterThan(rest.support.pos[2] + 0.05);
    expect(shotLayer("shotgun", rest, { ...fresh, since: forward }).pump).toBeCloseTo(0, 3);
  });
});

describe("the reload player", () => {
  it("cuts a shotgun reload short on a shot and blends straight back to the held gun", () => {
    const player = new ReloadPlayer("shotgun");
    const base = restPose("shotgun");
    player.start(seconds(6), false);
    for (let i = 0; i < 60; i++) {
      player.advance(1 / 60);
      player.pose(base, 1);
    }
    const lifted = player.pose(base, 1).body.rot[2];
    expect(Math.abs(lifted)).toBeGreaterThan(0.5);
    player.interrupt();
    expect(player.active).toBe(false);
    player.advance(0.05);
    expect(Math.abs(player.pose(base, 1).body.rot[2])).toBeLessThan(Math.abs(lifted));
    player.advance(0.3);
    expect(player.pose(base, 1)).toEqual(base);
  });

  it("nudges its clock onto the engine's shell count", () => {
    const player = new ReloadPlayer("shotgun");
    player.start(seconds(4), false);
    player.advance(seconds(1) - 0.05);
    player.shell();
    expect(player.time).toBeCloseTo(seconds(1), 6);
  });

  it("ends a magazine reload when the engine says it is loaded", () => {
    const player = new ReloadPlayer("rifle");
    player.start(2, false);
    player.advance(1.97);
    player.finish();
    player.advance(1 / 60);
    expect(player.active).toBe(false);
  });
});
