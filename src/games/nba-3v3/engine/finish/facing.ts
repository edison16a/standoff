import { RIM } from "../tuning";
import type { Athlete } from "../types";
import { yawOf, type V2 } from "../vec";
import { specOf } from "./ball-track";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

/**
 * How far the body has turned by `t`: a spin layup goes all the way
 * round on the gather, a reverse dunk turns its back to the rim in the
 * air, a 360 goes all the way round up there. It turns toward the
 * drive's `side`, which in yaw (+ to the left) is the other sign.
 */
export function turnAt(act: Drive, t: number): number {
  const turn = specOf(act).turn;
  if (!turn) return 0;
  const k =
    turn.during === "gather"
      ? smooth((t / Math.max(1e-3, act.takeoff) - 0.12) / 0.83)
      : smooth(((t - act.takeoff) / Math.max(1e-3, act.finish - act.takeoff) - 0.05) / 0.85);
  return turn.turns * Math.PI * 2 * -act.side * k;
}

/** Which way the body faces now: at the rim (or along a baseline reverse), plus the preset's turn. */
export function facingAt(act: Drive, at: V2, t: number): number {
  const base = specOf(act).yaw === "path" ? act.baseYaw : yawOf(RIM.x - at.x, RIM.z - at.z);
  return base + turnAt(act, t);
}
