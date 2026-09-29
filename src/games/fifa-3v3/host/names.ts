import { computerName, type BuildId } from "../builds";

/**
 * What a player is called everywhere on the big screen and the phones:
 * a phone's player by their own name, a computer player by its build,
 * like "CPU Winger". A phone that is away is still called by its name.
 */
export function nameOf(a: { seat: number | null; build: BuildId }, names: ReadonlyMap<number, string>): string {
  if (a.seat !== null) return names.get(a.seat) ?? computerName(a.build);
  return computerName(a.build);
}
