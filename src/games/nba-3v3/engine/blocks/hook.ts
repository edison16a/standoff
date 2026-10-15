import { airborne } from "../athlete";
import type { Match } from "../match";
import type { BallBody } from "../physics/air";
import { BALL } from "../physics/ball-spec";
import type { TouchHook } from "../physics/world";
import { missShot } from "../rules";
import type { Athlete } from "../types";
import { STEP } from "../tuning";
import { applyHit } from "./hit";
import { armAt, goaltend } from "./meet";
import type { BlockPlan } from "./plan";
import type { TouchPreset } from "./presets";

/** Slack round the reach once the planned moment has come, for a man nudged off his line since the plan. */
const SLACK = 0.3;

/**
 * Carries out the planned blocks as the shot flies, a few hundred times
 * a second. A defender whose plan says he gets it plays the hit on the
 * planned frame, when the preset's hand arrives, and not the first
 * instant the ball strays into his reach; one that was shoved off line
 * since, so the ball is no longer there for him, does not touch it.
 */
export function blockHook(m: Match): TouchHook | undefined {
  const b = m.ball;
  const shot = b.shot;
  if (b.mode !== "flight" || b.flightKind !== "shot" || !shot || shot.kind === "free" || shot.kind === "dunk") return undefined;
  const up = m.opponents(shot.team).filter((d) => d.action.kind === "block" && d.action.plan?.hit && airborne(d));
  if (!up.length) return undefined;
  return (body) => {
    if (b.flightKind !== "shot" || goaltend(body)) return;
    for (const d of up) {
      const act = d.action;
      const hit = act.kind === "block" ? act.plan?.hit : null;
      if (act.kind !== "block" || !hit) continue;
      if (act.t < act.plan!.at - STEP / 2) continue;
      const s = armAt(d, d.x, d.y, d.z);
      const gap = Math.hypot(body.pos.x - s.x, body.pos.y - s.y, body.pos.z - s.z) - s.reach - BALL.radius;
      if (gap > SLACK || body.pos.y < s.y - 0.2) continue;
      return touch(m, d, body, act.plan!);
    }
  };
}

/** The hand on the ball: it flies off the way the hit sends it, and the shot is over. */
function touch(m: Match, d: Athlete, body: BallBody, plan: BlockPlan): void {
  const b = m.ball;
  const shot = b.shot!;
  // A plan with a hit is never the near miss, so its preset is one with a touch.
  const hit = plan.hit!;
  applyHit(m, body, hit, d);
  d.box.blocks++;
  b.lastTouch = d.id;
  b.flightKind = "block";
  shot.outcome = "airball";
  // The planned ending is off: the ball flies on the physics alone.
  shot.flight.ride = null;
  m.emit({ type: "block", id: d.id, victim: shot.shooter, tip: hit === "tip", at: { ...body.pos }, hit, preset: plan.preset as TouchPreset });
  missShot(m);
}
