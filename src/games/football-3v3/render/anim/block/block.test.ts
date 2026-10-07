import { describe, expect, it } from "vitest";
import type { BlockKind } from "../../../engine/block-preset";
import type { AthleteView } from "../../../engine/view";
import { freshView } from "../../test-views";
import { choosePose, type PoseScene } from "../choose";
import { blockMove } from "./index";

/** A lineman `t` seconds into block move `kind`, on offense or defence. */
function lineman(kind: BlockKind, t: number, offense: boolean, more: Partial<AthleteView> = {}): AthleteView {
  const v = freshView();
  const a = v.athletes.find((x) => x.role === "lineman")!;
  return { ...a, number: 71, action: "none", blocked: true, block: { kind, t, offense }, ...more };
}

const pose = (kind: BlockKind, t: number, offense: boolean, more: Partial<AthleteView> = {}) => blockMove(lineman(kind, t, offense, more), 1, 0, 0);

describe("block moves", () => {
  it("punch both hands out off the snap, then fight with them", () => {
    const punch = pose("engage", 0.12, true)!;
    expect(punch.shLX).toBeLessThan(-1.4);
    expect(punch.elL).toBeGreaterThan(-0.4);
    const a = blockMove(lineman("engage", 0.4, true), 1, 0, 0)!;
    const b = blockMove(lineman("engage", 0.4, true), 1.2, 0, 0)!;
    expect(Math.abs(a.shLX - b.shLX)).toBeGreaterThan(0.05);
  });

  it("set tall in pass protection against a low bull rush, and sit the hips down to anchor", () => {
    const set = pose("pass", 1, true)!;
    const rush = pose("pass", 1, false)!;
    expect(rush.pitch).toBeGreaterThan(set.pitch + 0.3);
    const anchor = pose("anchor", 1, true)!;
    expect(anchor.kneeL + anchor.kneeR).toBeGreaterThan(set.kneeL + set.kneeR + 0.4);
  });

  it("fire out low on a drive block while the man being driven sits up", () => {
    expect(pose("drive", 1, true)!.pitch).toBeGreaterThan(pose("drive", 1, false)!.pitch + 0.4);
  });

  it("lean the man winning a shove in, and sit the one losing it up", () => {
    const winning = blockMove(lineman("pass", 1, false), 1, 0, 1)!;
    const losing = blockMove(lineman("pass", 1, false), 1, 0, -1)!;
    expect(winning.pitch).toBeGreaterThan(losing.pitch);
  });

  it("throw the blocker down over a man he pancaked, then stand him up and let him go", () => {
    expect(pose("pancake", 0.6, true)!.pitch).toBeGreaterThan(0.9);
    expect(pose("pancake", 2, true)).toBeNull();
    // The rusher is on the turf, drawn as a man pancaked onto his back.
    const v = freshView();
    const s: PoseScene = { phase: "live", phaseT: 1, offense: 0, ball: v.ball, winner: null, center: false, kicker: null, ceremonyT: null };
    const down = lineman("pancake", 0.6, false, { action: "down", actionT: 0.6, actionDur: 1.9, downCause: "pancaked" });
    expect(choosePose(down, s, { phase: 0, build: 0, time: 1, seed: 1 }).pose.pitch).toBeLessThan(-1.2);
  });

  it("swim the rusher over the top on a shed and spin the blocker round, then hand both back to the stride", () => {
    const swim = pose("shed", 0.16, false, { number: 71 })!;
    expect(Math.min(swim.shLX, swim.shRX)).toBeLessThan(-2.5);
    expect(Math.abs(pose("shed", 0.2, true)!.yaw)).toBeGreaterThan(0.5);
    expect(pose("shed", 0.7, false)).toBeNull();
    expect(pose("shed", 1, true)).toBeNull();
  });

  it("only holds a locked up move while the two are locked up", () => {
    expect(pose("pass", 1, true, { blocked: false })).toBeNull();
    expect(blockMove({ ...lineman("pass", 1, true), block: null }, 1, 0, 0)).toBeNull();
  });
});
