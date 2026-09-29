import type { HostRoomApi } from "@/platform/games/game-api";
import { cleanName, defaultName } from "@/platform/profile";

/** What the computer boxer is called everywhere. */
export const COMPUTER_NAME = "Computer";
const KEY = "standoff:boxing:names";

/**
 * Each player's name, which is who they are in the whole game: on the
 * pick screen, the waistband, the overlay, the commentary and the
 * results. A name from the room comes first, then the name typed here
 * last time, then "Player 1" and "Player 2". Names typed here are kept
 * in this browser only.
 */
export function loadNames(room: Pick<HostRoomApi, "players"> | null): [string, string] {
  let saved: string[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (Array.isArray(raw)) saved = raw.map((name) => (typeof name === "string" ? cleanName(name) : ""));
  } catch {
    // A private window or cleared storage: the defaults do.
  }
  const seats = room?.players() ?? [];
  const pick = (slot: 1 | 2) => cleanName(seats.find((p) => p.seat === slot)?.name ?? "") || saved[slot - 1] || defaultName(slot);
  return [pick(1), pick(2)];
}

export function saveNames(names: readonly [string, string]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(names));
  } catch {
    // Without storage the names are asked for again next time.
  }
}

/** A typed name, tidied, or the default for an empty box. */
export function nameOrDefault(raw: string, slot: 1 | 2): string {
  return cleanName(raw) || defaultName(slot);
}
