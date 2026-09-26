import type { BattleEvent } from "../engine/events";
import type { Fighter } from "../engine/fighter";
import type { BuzzKind } from "../protocol";

/**
 * Which phones buzz for a moment of the match, and how: the shooter
 * feels their hits land, the target feels them arrive, and everyone
 * feels the result. A kill replaces the hit that made it.
 */
export function buzzesFor(e: BattleEvent, fighters: readonly Fighter[]): { seat: number; kind: BuzzKind }[] {
  const seatOf = (id: number) => fighters[id]?.seat ?? null;
  const out: { seat: number; kind: BuzzKind }[] = [];
  const add = (id: number, kind: BuzzKind) => {
    const seat = seatOf(id);
    if (seat !== null) out.push({ seat, kind });
  };
  switch (e.type) {
    case "hit":
      if (e.health > 0) {
        add(e.shooter, e.head ? "head" : "hit");
        add(e.target, "hurt");
      }
      break;
    case "kill":
      add(e.killer, "kill");
      add(e.victim, "down");
      break;
    case "dry":
      add(e.shooter, "dry");
      break;
    case "reloaded":
      add(e.fighter, "reloaded");
      break;
    case "match-end":
      for (const f of fighters) add(f.id, f.team === e.winner ? "win" : "lose");
      break;
    default:
      break;
  }
  return out;
}
