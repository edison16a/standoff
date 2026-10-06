import type { Match } from "../match";
import { canThrow } from "../passing";
import { canPitch } from "../run-play";
import { pitchRead } from "./run";
import type { Athlete } from "../types";
import { chaseLoose, cover, pursue, rushQb, safety } from "./defense";
import { carry, escort, readField, runRoute } from "./offense";
import { botSkill, type FootballSkill } from "./skill";

/**
 * The computer players. Each one rethinks every so often (sooner the
 * harder the level) and holds its last move in between, the way a
 * person's reactions lag. Between plays and in Training they stand still.
 */
export function think(m: Match, dt: number): void {
  const skill = botSkill(m.level);
  for (const a of m.athletes) {
    if (!a.auto || a.role === "lineman") continue;
    if (m.phase !== "live" || !skill.acts) {
      a.move = { x: 0, z: 0 };
      continue;
    }
    a.bot.wait -= dt;
    if (a.bot.wait > 0) continue;
    a.bot.wait = Math.max(0.05, skill.reaction * 0.35);
    decide(m, a, skill);
    a.move = { x: a.bot.goal.x * skill.speed, z: a.bot.goal.z * skill.speed };
  }
}

function decide(m: Match, a: Athlete, skill: FootballSkill): void {
  if (m.ball.state === "loose" && m.ball.fumble) return chaseLoose(m, a);
  const carrier = m.carrier();
  const attacking = carrier ? carrier.team : m.offense;
  if (carrier === a) {
    if (a.role === "qb" && canPitch(m, a)) return pitchRead(m, a);
    if (a.role === "qb" && canThrow(m, a)) return readField(m, a, skill);
    return carry(m, a, skill);
  }
  if (a.team === attacking) {
    const play = m.play;
    if (carrier && (play?.caughtBy !== null || play?.pitched || play?.intercepted || play?.qbRun)) return escort(m, a, carrier);
    return runRoute(m, a);
  }
  if (carrier && (carrier.role !== "qb" || m.play?.qbRun || m.play?.intercepted)) return pursue(m, a, carrier, skill);
  if (a.bot.cover === null) return a.bot.rush ? rushQb(m, a, skill) : safety(m, a);
  return cover(m, a, skill);
}
