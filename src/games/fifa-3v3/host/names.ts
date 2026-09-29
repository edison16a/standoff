import { playerColor } from "@/games/kit/players";
import { BUILDS, computerName, type BuildId } from "../builds";
import type { MatchState } from "../engine/types";
import type { MatchView } from "../engine/view";
import type { Label } from "../render/match-renderer";
import { TEAMS } from "../teams";

/**
 * What a player is called everywhere on the big screen and the phones:
 * a phone's player by their own name, a computer player by its build,
 * like "CPU Winger". A phone that is away is still called by its name.
 */
export function nameOf(a: { seat: number | null; build: BuildId }, names: ReadonlyMap<number, string>): string {
  if (a.seat !== null) return names.get(a.seat) ?? computerName(a.build);
  return computerName(a.build);
}

/**
 * The tag over a player on the pitch, and the name on their shirt. A
 * phone's player keeps their name while away, in a computer's quieter
 * tag marked Away, since a computer plays for them until they are back.
 * A present player's tag also names their build. `view` may
 * be a replay's still; `match` says who really plays each place.
 */
export function tagOf(view: MatchView, match: MatchState | null, names: ReadonlyMap<number, string>, id: number): Label {
  const a = view.athletes[id];
  if (!a) return { name: "", colour: "#ffffff", human: false };
  const seat = match?.athletes[id]?.seat ?? null;
  if (seat === null) return { name: computerName(a.build), colour: TEAMS[a.team].color, human: false };
  const name = nameOf({ seat, build: a.build }, names);
  const here = a.seat !== null;
  // The build, or Away while a computer covers, used to sit in a strip along the bottom.
  const detail = here ? BUILDS[a.build].name : "Away";
  return { name, colour: here ? playerColor(seat) : TEAMS[a.team].color, human: here, shirt: name, detail };
}
