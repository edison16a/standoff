import { isHuman } from "../engine/athlete";
import { defending, guardInfo } from "../engine/guard";
import type { Athlete, MatchState } from "../engine/types";
import type { PhoneState } from "../protocol";
import { ROSTER } from "../roster";
import { momentOf } from "./moment";
import type { PublishContext } from "./publish";

/** What one phone shows: its setup, and in a match its side, the score and its own controls. */
export function phoneState(c: PublishContext, seat: number): PhoneState {
  const s = c.lobby.seats.get(seat)!;
  const match = c.driver?.state ?? null;
  const id = c.driver?.athleteBySeat.get(seat);
  const athlete = match && id !== undefined ? match.athletes[id] : undefined;
  const owner = match?.ball.owner;
  const team = athlete?.team ?? s.team;
  const over = match?.phase === "fulltime" && athlete;
  const hasBall = !!athlete && owner?.kind === "athlete" && owner.id === athlete.id;
  return {
    kind: "state",
    phase: c.phase,
    taken: c.lobby.taken(seat),
    pick: s.pick,
    ready: s.ready,
    team,
    playing: athlete !== undefined,
    score: match ? [match.score[0], match.score[1]] : [0, 0],
    clock: match ? Math.ceil(match.clock) : 0,
    golden: match?.golden ?? false,
    hasBall,
    goals: athlete?.stats.goals ?? 0,
    result: over ? (match.winner === athlete.team ? "win" : "lose") : null,
    // A word for the moment, from the score bug: the phone has no pop ups either.
    banner: match ? (momentOf(match, (i) => c.nameOf(i))?.text ?? null) : null,
    skip: c.replay.active && c.replay.votes.list().some((v) => v.seat === seat) ? { agreed: c.replay.votes.has(seat), count: c.replay.votes.count, total: c.replay.votes.total } : null,
    role: s.role,
    defending: !!match && !!athlete && !hasBall && defending(match, athlete),
    guard: match && athlete ? guard(match, athlete) : null,
    setPiece: match && athlete ? setPiecePart(match, athlete) : null,
  };
}

/** Guard's man and range, rounded so the phone is not sent a new state for every centimetre. */
function guard(match: MatchState, a: Athlete): PhoneState["guard"] {
  if (match.phase !== "play" || !isHuman(a)) return null;
  const info = guardInfo(match, a);
  if (!info) return null;
  const mark = match.athletes[info.mark]!;
  return { mark: ROSTER[mark.character].short, distance: Math.min(99, Math.round(info.distance)), inRange: info.inRange, on: info.on };
}

function setPiecePart(match: MatchState, a: Athlete): PhoneState["setPiece"] {
  const sp = match.setPiece;
  if (!sp || match.phase !== "setpiece") return null;
  const part = sp.taker === a.id ? "taker" : sp.wall.includes(a.id) ? "wall" : a.team === sp.team ? "attack" : "defend";
  return { kind: sp.kind, part, stage: sp.stage };
}
