import { describe, expect, it } from "vitest";
import { Match } from "../match";
import { BOTS, run } from "../test-helpers";

describe("a computer QB after his throw", () => {
  it("drifts a few steps after the ball at a walk instead of standing still", () => {
    const m = new Match({ entries: BOTS, seed: 3, level: "medium" });
    run(m, 300, (x) => x.ball.state === "pass" && !!x.play?.passed);
    expect(m.ball.state).toBe("pass");
    const qb = m.athletes.find((a) => a.role === "qb" && a.team === m.offense)!;
    // Let the follow through finish and the speed he threw with die away, then watch him walk.
    run(m, 0.35);
    const spot = m.ball.pass!.spot;
    const gap = () => Math.hypot(spot.x - qb.x, spot.z - qb.z);
    let farthest = gap();
    let top = 0;
    run(m, 1.2, (x) => {
      farthest = Math.max(farthest, gap());
      if (qb.action.kind === "none") top = Math.max(top, Math.hypot(qb.vx, qb.vz));
      return x.ball.state !== "pass";
    });
    expect(gap()).toBeLessThan(farthest - 0.2);
    expect(top).toBeLessThan(3.5);
  });

  it("stays still after his throw in the filmed showcase game", () => {
    const m = new Match({ entries: BOTS, seed: 3, level: "medium", filmed: true });
    run(m, 300, (x) => x.ball.state === "pass" && !!x.play?.passed);
    const qb = m.athletes.find((a) => a.role === "qb" && a.team === m.offense)!;
    run(m, 0.35);
    const from = { x: qb.x, z: qb.z };
    run(m, 0.5, (x) => x.ball.state !== "pass");
    expect(Math.hypot(qb.x - from.x, qb.z - from.z)).toBeLessThan(0.3);
  });
});
