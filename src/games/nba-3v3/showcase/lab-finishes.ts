import { RIM_SPOT } from "../engine/court";
import type { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import { GESTURES } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";

/**
 * Lab scenes for the finishes and the celebrations: `reverse` drives the
 * baseline under the rim for a reverse layup, `contact` drives into a
 * big man for a layup through the contact, `stepback` rises with a
 * defender in the chest, and `gesture` plays each celebration in turn.
 */
export const FINISH_SCENES = ["reverse", "contact", "stepback", "gesture"] as const;
export type FinishScene = (typeof FINISH_SCENES)[number];

const ASHBY = 0;

/** Where the six stand at the start: Ashby, two teammates, then Whitlock, Zupan and Crane. */
export const FINISH_SPOTS: Record<FinishScene, [number, number][]> = {
  reverse: [[5.2, 1.3], [-6, 6], [4, 9], [6.2, 2.6], [-5, 10], [5, 10.5]],
  contact: [[0, 6.4], [-6, 3], [6, 3], [-5, 10], [0, 3.3], [5, 10]],
  stepback: [[0, 7.6], [-6, 3], [6, 3], [0, 6.8], [-5, 10], [5, 10]],
  gesture: [[0, 6], [-6, 3], [6, 3], [-5, 10], [2, 10], [5, 10]],
};

export function steerFinish(scene: FinishScene, m: Match, t: number, once: (key: string) => boolean): void {
  const a = m.athletes[ASHBY]!;
  if (scene === "gesture") {
    const i = Math.floor((t - 0.3) / 1.9);
    if (t > 0.3 && i < GESTURES.length && once(`g${i}`)) a.action = { kind: "celebrate", t: 0, dur: 1.6, gesture: GESTURES[i]! };
    return;
  }
  if (scene === "stepback") {
    if (t > 0.4 && once("shoot")) m.press(ASHBY, "shoot");
    if (t > 0.4 + GREEN_MS / 1000 && once("release")) m.release(ASHBY, GREEN_MS);
    return;
  }
  if (a.action.kind === "drive" || m.ball.holder !== ASHBY) {
    a.move = { x: 0, z: 0 };
    return;
  }
  // Along the baseline and under the rim, or straight down the lane into the big man.
  const target: V2 = scene === "reverse" ? { x: -3, z: 1.2 } : RIM_SPOT;
  const d = dir2(a, target);
  a.move = { x: d.x, z: d.z };
  const near = Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z);
  const ready = scene === "reverse" ? a.x < 0.9 : near < 2.9;
  if (t > 0.4 && ready && once("finish")) {
    m.forced = "bank";
    m.press(ASHBY, "shoot");
  }
}
