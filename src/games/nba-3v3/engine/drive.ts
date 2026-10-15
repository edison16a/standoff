import { airborne } from "./athlete";
import { drivePosition, driveHeight } from "./body/drive-flight";
import { pressJump } from "./defend";
import { readApproach } from "./finish/approach";
import { ballInHands, specOf } from "./finish/ball-track";
import { facingAt } from "./finish/facing";
import { dunkChances, failFromSlam, failSlam, judgeDunk } from "./finish/dunk-fail";
import { gatherLift } from "./finish/footwork";
import { planFinish } from "./finish/plan";
import { selectFinish, type Intent } from "./finish/select";
import type { Match } from "./match";
import { launchShot, slam } from "./shooting";
import { JUMP } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2, type V3 } from "./vec";

/** The computer only dunks when it goes down at least this often. */
const BOT_DUNK_SENSE = 0.45;
/** Seconds a failed dunk holds its preset on the floor after the landing. */
export const FAIL_SETTLE = 0.36;

/**
 * Driving at the rim. The finish is picked before the gather starts
 * (`finish/select.ts`) from how the drive arrives: space means a dunk,
 * a defender close by means a layup preset that goes round him. Then
 * the preset plays out on its own footwork and timing, the ball riding
 * the hands (`finish/ball-track.ts`) to the release or the slam.
 */
export function startDrive(m: Match, a: Athlete, intent: Intent | null = null): void {
  const ap = readApproach(m, a);
  const forced = m.forcedFinish;
  m.forcedFinish = null;
  let pick = selectFinish(m.rng, ap, forced, intent);
  let chances = pick.dunk ? dunkChances(m, a, ap) : null;
  // The computer reads the odds and lays a bad dunk up instead; a person gets the dunk he asked for.
  if (chances && !intent && !forced && chances.odds.make < BOT_DUNK_SENSE) {
    pick = selectFinish(m.rng, { ...ap, canDunk: false });
    chances = null;
  }
  // A dunk's fate is rolled now, so a fail plays as its own preset from the first step (see `finish/dunk-odds.ts`).
  const judged = chances ? judgeDunk(m, chances) : null;
  const act = planFinish(m.rng, a, pick, m.ball.pos, judged?.fail ?? null);
  act.stopper = judged?.stopper?.id ?? null;
  a.action = act;
  a.yaw = facingAt(act, a, 0);
  const t = ap.threat;
  const man = t ? m.athletes[t.id] : undefined;
  // The man who will stuff it stands his ground: no bump sends him off his spot.
  const standing = man && man.id === act.stopper;
  if (man && t && !standing && !airborne(man) && t.dist < 1.6 && (t.spot === "path" || t.spot === "rim" || t.spot === "ballSide")) contact(m, a, man, t.edge, pick.dunk);
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
  const spec = specOf(act);
  a.y = driveHeight(act, t) + (t < act.takeoff ? gatherLift(spec.steps, t / act.takeoff) : 0);
  if (before < act.takeoff && t >= act.takeoff) m.emit({ type: "takeoff", id: a.id, dunk: act.dunk });
  // The pump fake of an up and under: a computer defender close by usually leaves his feet for it.
  const fake = act.takeoff * (act.layup === "juke" ? 0.42 : 0.45);
  if ((act.layup === "upUnder" || act.layup === "juke") && before < fake && t >= fake) biteOnFake(m, a);
  if (!act.released && t >= act.finish && m.ball.holder === a.id && m.phase === "live") {
    act.released = true;
    // The ball goes from where the hand has it right now.
    ballInHands(a, { ...act, t: act.finish }, hand);
    if (act.dunk && act.fail) failSlam(m, a, hand, act);
    else if (act.dunk) {
      // Met in the air, or knocked off line by a hand or a foul: the body plays that fail from the slam on,
      // never a made dunk's hang over a ball that rims out.
      if (!slam(m, a, hand)) failFromSlam(act, m.ball.flightKind === "block" ? "stuff" : "clang");
      else if (act.style === "poster") posterize(m, a);
    } else launchShot(m, a, "layup", "good", { ...hand });
  }
  if (before < act.land && t >= act.land) m.emit({ type: "land", id: a.id, hard: act.dunk });
  if (t >= act.land) a.y = 0;
  // A failed dunk stays in its preset a moment on the floor, for the heavy landing and getting back up.
  if (t >= act.land + (act.fail ? FAIL_SETTLE : 0)) {
    a.action = { kind: "none" };
    a.recover = act.fail ? JUMP.driveRecover * 1.5 : act.dunk ? JUMP.driveRecover : JUMP.shotRecover;
  }
}
