import { describe, expect, it } from "vitest";
import { eyeOf } from "../engine/fighter";
import { STEP } from "../engine/tuning";
import { buildLineup } from "./lineup";
import { MatchDriver } from "./match-driver";

function oneOnOne(): MatchDriver {
  const lineup = buildLineup(
    [
      { team: 0, seat: 1, gun: "smg" },
      { team: 1, seat: null, gun: null },
    ],
    () => "Me",
    "easy",
    9,
  );
  return new MatchDriver(lineup, 9);
}

describe("the match driver", () => {
  it("gives the one player the whole screen, and the television camera nothing", () => {
    const d = oneOnOne();
    expect(d.panes).toEqual([{ fighter: 0, rect: { x: 0, y: 0, w: 1, h: 1 } }]);
    expect(d.viewOf(1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(d.viewOf(2)).toBeNull();
    expect(d.labels[0]!.name).toBe("Me");
  });

  it("points the gun where the player points in their view", () => {
    const d = oneOnOne();
    const me = d.fighterOf(1)!;
    const eye = eyeOf(me);
    // Looking up and away over everything, the middle of the view is a far point straight along the camera.
    d.aim(1, { x: 0, y: 0 }, { ...eye, yaw: 0.7, pitch: 0.3, fov: 60, aspect: 16 / 9 });
    expect(me.aim.yaw).toBeCloseTo(0.7, 3);
    expect(me.aim.pitch).toBeCloseTo(0.3, 3);
    // A point to the right of the middle turns the gun right, which is a smaller yaw facing +z.
    d.aim(1, { x: 0.5, y: 0 }, { ...eye, yaw: 0.7, pitch: 0.3, fov: 60, aspect: 16 / 9 });
    expect(me.aim.yaw).toBeLessThan(0.7);
    // Without a camera there is nothing to aim through, so the aim stays put.
    const before = { ...me.aim };
    d.aim(1, { x: -1, y: -1 }, null);
    expect(me.aim).toEqual(before);
  });

  it("only takes a trigger press during the fight, but always the release", () => {
    const d = oneOnOne();
    const me = d.fighterOf(1)!;
    d.trigger(1, true);
    expect(me.trigger.held).toBe(false);
    while (d.battle.match.phase !== "fight") d.advance(0.05);
    d.trigger(1, true);
    expect(me.trigger.held).toBe(true);
    d.trigger(1, false);
    expect(me.trigger.held).toBe(false);
  });

  it("steps the battle at its own rate, faster with turbo, and never runs away after a stall", () => {
    const d = oneOnOne();
    d.advance(0.05, 2);
    expect(d.battle.time).toBeCloseTo(6 * STEP, 6);
    d.advance(5);
    expect(d.battle.time).toBeCloseTo(12 * STEP, 6);
  });
});
