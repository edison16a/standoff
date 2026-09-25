import type { MatchEvent } from "../engine/events";
import type { MatchState } from "../engine/types";
import type { BuzzKind } from "../protocol";

/** Which phones should buzz for an event, and how. Only fighters played from a phone count. */
export function buzzesFor(e: MatchEvent, m: MatchState): { seat: number; kind: BuzzKind }[] {
  const seatOf = (id: number | null) => (id === null ? null : (m.fighters[id]?.seat ?? null));
  const out: { seat: number; kind: BuzzKind }[] = [];
  const add = (id: number | null, kind: BuzzKind) => {
    const seat = seatOf(id);
    if (seat !== null) out.push({ seat, kind });
  };
  switch (e.type) {
    case "hit":
      add(e.attacker, "hit");
      add(e.target, "hurt");
      break;
    case "ko":
      add(e.id, "fall");
      if (e.by !== null) add(e.by, "ko");
      break;
    case "ultReady":
      add(e.id, "ult");
      break;
    case "game":
      for (const f of m.fighters) add(f.id, f.id === e.winner ? "win" : "lose");
      break;
  }
  return out;
}
