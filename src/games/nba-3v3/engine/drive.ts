import { airborne } from "./athlete";
import { drivePosition, driveHeight } from "./body/drive-flight";
import { pressJump } from "./defend";
import { readApproach } from "./finish/approach";
import { ballInHands, specOf } from "./finish/ball-track";
import { facingAt } from "./finish/facing";
import { planFinish } from "./finish/plan";
import { selectFinish } from "./finish/select";
import type { Match } from "./match";
import { launchShot, slam } from "./shooting";
import { JUMP } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, type V3 } from "./vec";

/**
 * Driving at the rim. The finish is picked before the gather starts
 * (`finish/select.ts`) from how the drive arrives: space means a dunk,
 * a defender close by means a layup preset that goes round him. Then
 * the preset plays out on its own footwork and timing, the ball riding
 * the hands (`finish/ball-track.ts`) to the release or the slam.
 */
export function startDrive(m: Match, a: Athlete): void {
  const ap = readApproach(m, a);
  const pick = selectFinish(m.rng, ap, m.forcedFinish);
  m.forcedFinish = null;
  a.action = planFinish(m.rng, a, pick, m.ball.pos);
  a.yaw = facingAt(a.action, a, 0);
  const t = ap.threat;
  const man = t ? m.athletes[t.id] : undefined;
  if (man && t && !airborne(man) && t.dist < 1.6 && (t.spot === "path" || t.spot === "rim" || t.spot === "ballSide")) contact(m, a, man, t.edge, pick.dunk);
  m.emit({ type: "gather", id: a.id, kind: pick.dunk ? "dunk" : "layup" });
}

/**
 * Into a defender's body: much more muscle sends him sprawling (a
 * poster, or a layup straight through him); otherwise it is a bump
 * the finish absorbs.
 */
function contact(m: Match, a: Athlete, man: Athlete, edge: number, dunk: boolean): void {
  if (edge >= 2) {
    const push = dir2(a, man);
    man.vx = push.x * 4;
    man.vz = push.z * 4;
    man.action = { kind: "stumble", t: 0, dur: 1, fall: "back" };
    m.emit({ type: "knockdown", id: man.id, by: a.id });
    return;
  }
  const power = clamp(0.4 - edge * 0.08 + (dunk ? 0.15 : 0), 0.3, 0.9);
  m.emit({ type: "bump", a: a.id, b: man.id, power });
}

/** Dunked on: the man under it is sent back off his feet as the slam comes down through him. */
function posterize(m: Match, a: Athlete): void {
  const man = m.opponents(a.team).find((o) => dist2(o, a) < 1.5 && o.action.kind !== "stumble");
  if (!man) return;
  const push = dir2(a, man);
  man.vx = push.x * 3;
  man.vz = push.z * 3;
  man.action = { kind: "stumble", t: 0, dur: 1.1, fall: "back" };
  m.emit({ type: "knockdown", id: man.id, by: a.id });
}

/** The man nearest the fake jumps at it, mostly, and is in the air as the driver steps through under him. */
function biteOnFake(m: Match, a: Athlete): void {
  const man = m.opponents(a.team).find((o) => o.auto && dist2(o, a) < 1.8);
  if (man && m.rng() < 0.75) pressJump(m, man);
}

const hand: V3 = { x: 0, y: 0, z: 0 };

export function updateDrive(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "drive") return;
  const before = act.t;
  act.t += dt;
  const t = act.t;
  drivePosition(act, specOf(act).steps, t, a);
  a.vx = a.vz = 0;
  // A layup along the baseline keeps its facing once the ball is gone, rather than snapping round.
  if (t < act.finish || specOf(act).yaw === "rim") a.yaw = facingAt(act, a, Math.min(t, act.finish));
  a.y = driveHeight(act, t);
  if (before < act.takeoff && t >= act.takeoff) m.emit({ type: "takeoff", id: a.id, dunk: act.dunk });
  // The pump fake of an up and under: a computer defender close by usually leaves his feet for it.
  const fake = act.takeoff * 0.45;
  if (act.layup === "upUnder" && before < fake && t >= fake) biteOnFake(m, a);
  if (!act.released && t >= act.finish && m.ball.holder === a.id && m.phase === "live") {
    act.released = true;
    // The ball goes from where the hand has it right now.
    ballInHands(a, { ...act, t: act.finish }, hand);
    if (act.dunk) {
      slam(m, a, hand);
      if (act.style === "poster") posterize(m, a);
    } else launchShot(m, a, "layup", "good", { ...hand });
  }
  if (t >= act.land) {
    a.y = 0;
    a.action = { kind: "none" };
    a.recover = act.dunk ? JUMP.driveRecover : JUMP.shotRecover;
    m.emit({ type: "land", id: a.id, hard: act.dunk });
  }
}
