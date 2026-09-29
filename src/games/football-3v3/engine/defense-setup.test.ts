import { describe, expect, it } from "vitest";
import { yardToX } from "./field";
import { seatStatus } from "./status";
import { bySeat, peopleMatch, run } from "./test-helpers";

describe("the defence while the offense calls the play", () => {
  it("keeps its pad up through the call and the line up", () => {
    const m = peopleMatch();
    expect(m.phase).toBe("choose");
    expect(seatStatus(m, 3)?.pad).toBe("defense");
    m.choose(m.qbOf(m.offense).id, "throw");
    expect(seatStatus(m, 3)?.pad).toBe("defense");
  });

  it("moves during the call, keeps that spot at the line up, and stays onside", () => {
    const m = peopleMatch();
    const d = bySeat(m, 3);
    const start = { x: d.x, z: d.z };
    m.setMove(d.id, { x: 0, z: 1 });
    run(m, 1);
    expect(d.z - start.z).toBeGreaterThan(2);
    m.choose(m.qbOf(m.offense).id, "throw");
    expect(d.z - start.z).toBeGreaterThan(2);
    // Pushing at the line never takes a defender across it before the snap.
    m.setMove(d.id, { x: -m.sign, z: 0 });
    run(m, 1.5);
    expect((d.x - yardToX(m.offense, m.drive.los)) * m.sign).toBeGreaterThan(0);
  });

  it("keeps the offense still while its QB decides", () => {
    const m = peopleMatch();
    const wr = bySeat(m, 1);
    const x = wr.x;
    m.setMove(wr.id, { x: 1, z: 0 });
    run(m, 1);
    expect(wr.x).toBeCloseTo(x);
  });
});
