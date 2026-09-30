import { describe, expect, it } from "vitest";
import { ICON_RUN, iconMatch } from "./icon-film";

describe("the icon's film", () => {
  const state = iconMatch(1.36);
  const striker = state.athletes[0]!;

  it("holds the Striker winding up to shoot, the ball still at his boot", () => {
    expect(striker.action).toBe("shoot");
    expect(state.ball.owner).toEqual({ kind: "athlete", id: 0 });
    expect(Math.hypot(state.ball.pos.x - striker.pos.x, state.ball.pos.z - striker.pos.z)).toBeLessThan(1);
  });

  it("has him running the way the camera and the lights expect", () => {
    const run = { x: striker.pos.x - ICON_RUN.from.x, z: striker.pos.z - ICON_RUN.from.z };
    const along = run.x * ICON_RUN.dir.x + run.z * ICON_RUN.dir.z;
    expect(along).toBeGreaterThan(6);
    expect(Math.abs(run.x * ICON_RUN.dir.z - run.z * ICON_RUN.dir.x)).toBeLessThan(0.5);
  });

  it("leaves nobody near him", () => {
    for (const a of state.athletes.slice(1)) expect(Math.hypot(a.pos.x - striker.pos.x, a.pos.z - striker.pos.z)).toBeGreaterThan(8);
    expect(Math.hypot(state.referee.pos.x - striker.pos.x, state.referee.pos.z - striker.pos.z)).toBeGreaterThan(8);
  });
});
