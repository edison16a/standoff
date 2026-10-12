import { attackSign } from "../../teams";
import { isDown } from "../body";
import { startRush } from "../controls";
import { FIELD, YARD, yardToX } from "../field";
import type { Match } from "../match";
import { clinchOf } from "../support/clinch";
import { LAYERS } from "../support/formation";
import { defenseJob, isReceiver, sideOf } from "../support/roster";
import type { Athlete } from "../types";
import { clamp, dist2, type V2 } from "../vec";
import { breakOnBall, pursue, rushQb } from "./defense";
import { ahead, headFor } from "./goal";
import type { FootballSkill } from "./skill";

/** Inside this the deep man stops keeping leverage and comes up to make the tackle. */
const DEEP_TRIGGER = 13;

const onField = (p: V2): V2 => ({ x: clamp(p.x, -(FIELD.endX - 1), FIELD.endX - 1), z: clamp(p.z, -(FIELD.halfWidth - 1), FIELD.halfWidth - 1) });

/** Receivers past the line, the deep threat among them, the men a dropping defender has to keep in front of him. */
export const routes = (m: Match) => m.athletes.filter((r) => r.team === m.offense && isReceiver(r) && !isDown(r));

/**
 * A backer in his zone while the QB looks to throw: nine yards off on
 * his side, sliding over any runner who comes into it. He reads the
 * runner a moment ahead and leans off his spot toward him, both by his
 * reaction time: a slow bot has to guess further and stay closer. The
 * deep threat going past he leaves to the deep man.
 */
function zone(m: Match, a: Athlete, skill: FootballSkill): void {
  const s = m.sign;
  const home = { x: yardToX(m.offense, m.drive.los) + s * LAYERS.backer * YARD, z: m.drive.ballZ + sideOf(a.slot) * 7 };
  const near = routes(m).filter((r) => !r.deep && Math.abs(r.z - home.z) < 10).sort((p, q) => dist2(p, home) - dist2(q, home))[0];
  // The showcase's game was filmed before backers read the runner (Match.filmed).
  const read = m.filmed ? 0 : skill.reaction;
  const at = near ? ahead(near, read * 0.5) : null;
  const lean = 0.5 + read * 0.3;
  const spot = at ? { x: at.x + s * 2.5, z: at.z * lean + home.z * (1 - lean) } : { x: home.x, z: home.z + (m.ball.pos.z - home.z) * 0.3 };
  headFor(a, onField(spot), 1);
}

/** How far over the top the deep man plays a receiver, metres: tighter on the deep threat he keys. */
const CUSHION = { keyed: 4.5, deepest: 6 } as const;

/** Seconds ahead he reads the man he keys, so he bails in time against a sprinter. */
const KEY_LEAD = 0.6;

/**
 * The deep man over the top: always deeper than the deepest receiver,
 * drifting with the ball. Keyed on the deep threat (every play he has
 * one), he shades toward him from the snap and stays a few steps over
 * the top.
 */
function deepZone(m: Match, a: Athlete): void {
  const s = m.sign;
  const key = a.bot.key ? routes(m).find((r) => r.deep) : undefined;
  let x = yardToX(m.offense, m.drive.los) + s * LAYERS.deep * YARD;
  let z = key ? key.z * 0.4 + m.ball.pos.z * 0.6 : m.ball.pos.z * 0.5;
  for (const r of routes(m)) {
    const at = r === key ? ahead(r, KEY_LEAD) : r;
    const cushion = r === key ? CUSHION.keyed : CUSHION.deepest;
    if ((at.x + s * cushion - x) * s > 0) {
      x = at.x + s * cushion;
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
    return job === "backer" ? zone(m, a, skill) : deepZone(m, a);
  }
  if (job === "deep") return lastLayer(m, a, carrier, skill);
  pursue(m, a, carrier, skill);
}
