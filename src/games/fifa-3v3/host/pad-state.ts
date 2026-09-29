import { defending, guardStatus, guardTarget } from "../engine/guard";
import type { Athlete, MatchState } from "../engine/types";
import { dist } from "../engine/vec";
import type { PhoneState } from "../protocol";

type PadFields = Pick<PhoneState, "mode" | "guard" | "markDistance" | "kick">;

const NONE: PadFields = { mode: "attack", guard: "off", markDistance: null, kick: null };

/**
 * What a phone's controller should offer its player now: the attacking
 * buttons, the defending ones with how far away their man is, or the
 * free kick controls when they are the one taking it.
 */
export function padFields(match: MatchState | null, athlete: Athlete | undefined): PadFields {
  if (!match || !athlete) return NONE;
  const sp = match.setPiece;
  if (match.phase === "setpiece" && sp) {
    const taker = sp.taker === athlete.id;
    return { ...NONE, mode: taker ? "kick" : "wait", kick: { kind: sp.kind, stage: sp.stage, curve: Math.round(sp.curve * 100) / 100, taker, team: sp.team } };
  }
  if (match.phase === "foul") return { ...NONE, mode: "wait" };
  if (!defending(match, athlete)) return NONE;
  const man = guardTarget(match, athlete);
  // Rounded to half metres, so the phone is not sent a new number every step.
  const markDistance = man ? Math.min(99, Math.round(dist(athlete.pos, man.pos) * 2) / 2) : null;
  return { mode: "defend", guard: guardStatus(match, athlete), markDistance, kick: null };
}
