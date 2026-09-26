import { playerColor } from "@/games/kit/players";
import type { Difficulty, FighterSetup, TeamId } from "../engine/fighter";
import { GUN_IDS, type GunId } from "../engine/guns";
import { Rng } from "../engine/rng";
import { assignCharacters } from "../roster";

/** Computer players' names: short call signs, easy to read on a tag across the field. */
export const CALL_SIGNS = ["Viper", "Ghost", "Blitz", "Echo", "Rook", "Nova", "Talon", "Jinx"] as const;

/** A place in the match as the lobby hands it over. */
export interface LineupEntry {
  team: TeamId;
  seat: number | null;
  gun: GunId | null;
}

export interface Lineup {
  setups: FighterSetup[];
  /** Each fighter's colour: the seat's own for players, the free seat colours for computers. */
  colours: string[];
}

/**
 * Turns the lobby's places into fighters. Characters are dealt at random
 * so no two fighters share one. A computer player takes a gun its
 * teammates do not have, so each side mixes its ranges, and a name and
 * colour nobody else is using.
 */
export function buildLineup(entries: readonly LineupEntry[], nameOf: (seat: number) => string, difficulty: Difficulty, seed: number): Lineup {
  const rng = new Rng(seed);
  const characters = assignCharacters(entries.length, rng);
  const names = shuffle([...CALL_SIGNS], rng);
  const humanSeats = new Set(entries.flatMap((e) => (e.seat === null ? [] : [e.seat])));
  const spareColours = [1, 2, 3, 4].filter((seat) => !humanSeats.has(seat)).map(playerColor);
  // Players' guns are known; each computer then takes one its side does not have yet.
  const guns: (GunId | null)[] = entries.map((e) => (e.seat === null ? null : (e.gun ?? "rifle")));
  entries.forEach((entry, i) => {
    if (entry.seat !== null) return;
    const side = guns.filter((g, j) => g !== null && entries[j]!.team === entry.team);
    const free = GUN_IDS.filter((g) => !side.includes(g));
    guns[i] = rng.pick(free.length ? free : GUN_IDS);
  });
  const setups: FighterSetup[] = [];
  const colours: string[] = [];
  entries.forEach((entry, i) => {
    const base = { team: entry.team, seat: entry.seat, character: characters[i]!, gun: guns[i]! };
    if (entry.seat !== null) {
      setups.push({ ...base, name: nameOf(entry.seat) });
      colours.push(playerColor(entry.seat));
    } else {
      setups.push({ ...base, name: names[i % names.length]!, difficulty });
      colours.push(spareColours.shift() ?? "#e5e7eb");
    }
  });
  return { setups, colours };
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}
