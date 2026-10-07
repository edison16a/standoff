import { attackSign } from "../../teams";
import { isDown } from "../body";
import { startRush } from "../controls";
import { FIELD, YARD, yardToX } from "../field";
import type { Match } from "../match";
import { clinchOf } from "../support/clinch";
import { LAYERS } from "../support/formation";
import { defenseJob, sideOf } from "../support/roster";
import type { Athlete } from "../types";
import { clamp, dist2, type V2 } from "../vec";
import { breakOnBall, pursue, rushQb } from "./defense";
import { headFor } from "./goal";
import type { FootballSkill } from "./skill";

/** Inside this the deep man stops keeping leverage and comes up to make the tackle. */
const DEEP_TRIGGER = 13;

const onField = (p: V2): V2 => ({ x: clamp(p.x, -(FIELD.endX - 1), FIELD.endX - 1), z: clamp(p.z, -(FIELD.halfWidth - 1), FIELD.halfWidth - 1) });

/** Receivers past the line, the men a dropping defender has to keep in front of him. */
const routes = (m: Match) => m.athletes.filter((r) => r.team === m.offense && r.role === "runner" && !isDown(r));

/**
 * A backer in his zone while the QB looks to throw: nine yards off on
 * his side, sliding under any receiver who comes into it.
 */
function zone(m: Match, a: Athlete): void {
  const s = m.sign;
  const home = { x: yardToX(m.offense, m.drive.los) + s * LAYERS.backer * YARD, z: m.drive.ballZ + sideOf(a.slot) * 7 };
  const near = routes(m).filter((r) => Math.abs(r.z - home.z) < 10).sort((p, q) => dist2(p, home) - dist2(q, home))[0];
  const spot = near ? { x: near.x + s * 2.5, z: (near.z + home.z) / 2 } : { x: home.x, z: home.z + (m.ball.pos.z - home.z) * 0.3 };
  headFor(a, onField(spot), 1);
}

/** The deep man over the top: always deeper than the deepest receiver, drifting with the ball. */
function deepZone(m: Match, a: Athlete): void {
  const s = m.sign;
  let x = yardToX(m.offense, m.drive.los) + s * LAYERS.deep * YARD;
  let z = m.ball.pos.z * 0.5;
  for (const r of routes(m)) {
    if ((r.x + s * 6 - x) * s > 0) {
      x = r.x + s * 6;
      z = r.z * 0.6 + m.ball.pos.z * 0.4;
    }
  }
  headFor(a, onField({ x, z }), 1);
}

/**
 * The last layer against a runner: from far off the deep man keeps
 * himself between the ball and the goal line, closing the angle, and
 * only comes up to tackle once the runner is close.
 */
function lastLayer(m: Match, a: Athlete, carrier: Athlete, skill: FootballSkill): void {
  const d = dist2(a, carrier);
  if (d < DEEP_TRIGGER) return pursue(m, a, carrier, skill);
  const g = attackSign(carrier.team);
  headFor(a, onField({ x: carrier.x + g * Math.min(12, d * 0.55), z: carrier.z }), 0.5);
}

/**
 * A support player on the side without the ball. The edges rush the
 * passer; the backers and the deep man sit in their layers until the
 * ball is run, then the backers fly to it and the deep man keeps the
 * last line. Held in a block, he fights toward the ball.
 */
export function supportDefense(m: Match, a: Athlete, carrier: Athlete | null, skill: FootballSkill): void {
  if (breakOnBall(m, a)) return;
  if (clinchOf(m, a.id)) {
    if (a.rushCd <= 0 && m.rng.chance(skill.accuracy * 0.5)) startRush(a);
    return headFor(a, carrier ?? m.ball.pos, 0.3);
  }
  if (!carrier) return headFor(a, m.ball.pos, 1);
  const play = m.play;
  const passing = carrier.role === "qb" && carrier.team === m.offense && play?.call === "throw" && !play.passed && !play.qbRun;
  const job = defenseJob(a.slot);
  if (passing) {
    if (job === "edge") return rushQb(m, a, skill);
    return job === "backer" ? zone(m, a) : deepZone(m, a);
  }
  if (job === "deep") return lastLayer(m, a, carrier, skill);
  pursue(m, a, carrier, skill);
}
