import { describe, expect, it } from "vitest";
import { flightTime, leadPass, pickTarget, solveLaunch } from "./aim";
import { launch, predict } from "./flight";

describe("assisted aim", () => {
  const receivers = [
    { id: 1, x: 20, z: 8 },
    { id: 2, x: 15, z: -10 },
  ];

  it("targets the receiver nearest the aim line", () => {
    expect(pickTarget({ x: 0, z: 0 }, { x: 1, z: 0.4 }, receivers)).toBe(1);
    expect(pickTarget({ x: 0, z: 0 }, { x: 1, z: -0.6 }, receivers)).toBe(2);
  });

  it("ignores a receiver behind the QB while one is ahead of the line", () => {
    expect(pickTarget({ x: 0, z: 0 }, { x: -1, z: 0 }, [{ id: 3, x: -5, z: 0 }, { id: 1, x: 20, z: 8 }])).toBe(3);
    expect(pickTarget({ x: 0, z: 0 }, { x: 1, z: 0 }, [{ id: 3, x: -5, z: 0 }, { id: 1, x: 20, z: 30 }])).toBe(1);
  });

  it("has no target without a stick or receivers", () => {
    expect(pickTarget({ x: 0, z: 0 }, { x: 0, z: 0 }, receivers)).toBeNull();
    expect(pickTarget({ x: 0, z: 0 }, { x: 1, z: 0 }, [])).toBeNull();
  });

  it("gives deep balls more air than short ones", () => {
    expect(flightTime(40, 7)).toBeGreaterThan(flightTime(10, 7) * 2);
    expect(flightTime(30, 10)).toBeLessThan(flightTime(30, 3));
  });

  it("solves a launch that lands on the spot through the drag", () => {
    const from = { x: 0, y: 2, z: 0 };
    const to = { x: 35, y: 1.3, z: 6 };
    const vel = solveLaunch(from, to, 1.8, "spiral", 62);
    const end = predict(launch(from, vel, "spiral", 62, 0), 1.8).pos;
    expect(Math.hypot(end.x - to.x, end.y - to.y, end.z - to.z)).toBeLessThan(0.1);
  });

  it("leads a receiver on the run so the ball meets them", () => {
    const from = { x: 0, y: 2, z: 0 };
    const lead = leadPass(from, { x: 10, z: 5 }, { x: 8, z: 0 }, 8);
    const receiverThen = { x: 10 + 8 * lead.time, z: 5 };
    expect(Math.abs(lead.spot.x - receiverThen.x)).toBeLessThan(0.2);
    const ball = predict(launch(from, lead.vel, "spiral", 62, 0), lead.time).pos;
    expect(Math.hypot(ball.x - receiverThen.x, ball.z - receiverThen.z)).toBeLessThan(0.2);
  });
});
