import { describe, expect, it } from "vitest";
import { adminFieldGoal, adminTouchdown, adminTwoPoint } from "./admin";
import { seatControls } from "./controls";
import { newDrive } from "./downs";
import { xFromGoal, yardsToGoal } from "./field";
import { beginCall } from "./flow";
import { endReplay } from "./match";
import { bySeat, cmd, game, place, run, snapped } from "./test-kit";
import { KICK, MATCH } from "./tuning";
import { v2 } from "./vec";

describe("before the snap", () => {
  it("waits for the quarterback's call, then the hike", () => {
    const s = game();
    expect(s.phase).toBe("call");
    expect(seatControls(s, 0)?.mode).toBe("call");
    expect(seatControls(s, 3)?.mode).toBe("wait");
    run(s, 0.1, cmd(0, { call: "throw" }));
    expect(s.phase).toBe("presnap");
    expect(seatControls(s, 0)?.mode).toBe("hike");
    expect(seatControls(s, 3)?.mode).toBe("defense");
    const events = run(s, 0.1, cmd(0, { hike: true }));
    expect(events.find((e) => e.type === "hike")).toMatchObject({ auto: false });
    expect(s.phase).toBe("live");
  });

  it("snaps it anyway when the hike window runs out", () => {
    const s = game();
    run(s, 0.1, cmd(0, { call: "throw" }));
    const events = run(s, MATCH.hikeWindow + 0.2);
    expect(events.find((e) => e.type === "hike")).toMatchObject({ auto: true });
  });

  it("makes the call for a quarterback who never does", () => {
    const s = game();
    run(s, MATCH.callWait + 0.2);
    expect(s.phase).not.toBe("call");
    expect(s.play.call).toBe("throw");
  });

  it("stops the clock between plays and runs it during them", () => {
    const s = game();
    const start = s.clock;
    run(s, 2);
    expect(s.clock).toBe(start);
    snapped(s);
    expect(s.clock).toBeLessThan(start);
  });
});

describe("kicking", () => {
  it("scores a field goal from the bars the phone stopped", () => {
    const s = game();
    s.drive = { ...newDrive(0, xFromGoal(0, 15)), down: 4 };
    beginCall(s);
    expect(seatControls(s, 0)?.kick).toBe("fieldgoal");
    run(s, 0.1, cmd(0, { call: "kick" }));
    expect(s.phase).toBe("kick");
    expect(seatControls(s, 0)).toMatchObject({ mode: "kick", bar: "aim" });
    run(s, 0.1, cmd(0, { kickAim: 0.02 }));
    expect(seatControls(s, 0)).toMatchObject({ mode: "kick", bar: "power" });
    const events = run(s, 5, cmd(0, { kickPower: 0.85 }));
    expect(events.find((e) => e.type === "kickResult")).toMatchObject({ kind: "fieldgoal", good: true });
    expect(s.score).toEqual([3, 0]);
    run(s, MATCH.scoreWait);
    expect(s.drive.offense).toBe(1);
    expect(yardsToGoal(1, s.drive.los)).toBe(75);
  });

  it("punts the ball away from deep in its own half", () => {
    const s = game();
    s.drive = { ...newDrive(0, xFromGoal(0, 80)), down: 4 };
    beginCall(s);
    expect(seatControls(s, 0)?.kick).toBe("punt");
    run(s, 0.1, cmd(0, { call: "kick" }));
    run(s, 0.1, cmd(0, { kickAim: 0 }));
    run(s, 0.1, cmd(0, { kickPower: 1 }));
    run(s, 6 + KICK.resultWait);
    expect(s.drive.offense).toBe(1);
    // Kicked from Red's own 20: Blue takes over well inside its own half.
    expect(yardsToGoal(1, s.drive.los)).toBeGreaterThan(50);
  });
});

describe("scoring", () => {
  it("runs a touchdown through the celebration and replay to the try, then kicks the extra point", () => {
    const s = game();
    s.options.replays = true;
    expect(adminTouchdown(s)).toBe(true);
    expect(s.score).toEqual([6, 0]);
    expect(s.phase).toBe("score");
    expect(bySeat(s, 1).stats.touchdowns).toBe(1);
    run(s, MATCH.scoreWait + 0.1);
    expect(s.phase).toBe("replay");
    endReplay(s);
    expect(s.phase).toBe("call");
    expect(s.play.isTry).toBe(true);
    expect(seatControls(s, 0)).toMatchObject({ mode: "call", kick: "pat", isTry: true });
    run(s, 0.1, cmd(0, { call: "kick" }));
    run(s, 0.1, cmd(0, { kickAim: 0 }));
    run(s, 5, cmd(0, { kickPower: 0.7 }));
    expect(s.score).toEqual([7, 0]);
  });

  it("gives two for a try carried in", () => {
    const s = game();
    adminTwoPoint(s);
    expect(s.play.isTry).toBe(true);
    snapped(s);
    const qb = bySeat(s, 0);
    place(qb, xFromGoal(0, 1.5), 6);
    run(s, 1.2, cmd(qb.id, { move: v2(1, 0) }));
    expect(s.score).toEqual([2, 0]);
    expect(qb.stats.touchdowns).toBe(0);
  });

  it("gives up a safety when the carrier goes down in his own end zone", () => {
    const s = game();
    s.drive = newDrive(0, xFromGoal(0, 97));
    beginCall(s);
    snapped(s);
    place(bySeat(s, 0), xFromGoal(0, 101), 0);
    place(bySeat(s, 3), xFromGoal(0, 99.5), 0);
    run(s, 0.8, cmd(bySeat(s, 3).id, { tackle: true }));
    expect(s.score).toEqual([0, 2]);
  });

  it("wins at 14 and ends the game after the celebration", () => {
    const s = game();
    s.options.replays = false;
    s.score = [8, 0];
    adminTouchdown(s);
    expect(s.winner).toBe(0);
    run(s, MATCH.scoreWait + 0.1);
    expect(s.phase).toBe("final");
  });

  it("sets up a field goal try for the admin panel", () => {
    const s = game();
    expect(adminFieldGoal(s)).toBe(true);
    expect(s.kick?.kind).toBe("fieldgoal");
  });
});

describe("the quarters", () => {
  it("hands the ball to the other side at the half", () => {
    // Easy bots, so someone brings the quarterback down and the play ends.
    const s = game("easy");
    s.quarter = 2;
    s.clock = 0.5;
    snapped(s);
    // The quarterback runs it; the computer defenders bring him down.
    run(s, 12, cmd(0, { move: v2(1, 0.3) }));
    expect(s.quarter).toBe(3);
    expect(s.drive.offense).toBe(1);
  });
});
