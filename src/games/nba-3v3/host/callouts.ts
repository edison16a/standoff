import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { TEAMS } from "../roster";
import type { Banner } from "./host-store";

export type BannerText = Omit<Banner, "key">;

const pick = <T,>(options: readonly T[], n: number): T => options[Math.abs(n) % options.length]!;

/**
 * The banner across the big screen, for the moments that change the
 * game: the tip, a block or a steal, a turnover, game point and the
 * win. Baskets get no banner; the crowd greets them and the
 * scoreboard ticks over. `nameOf` gives the name the room knows a
 * player by, and `n` varies the wording.
 */
export function banner(e: MatchEvent, m: Match, nameOf: (id: number) => string, n: number): BannerText | null {
  const tone = (id: number) => (m.athletes[id]?.team === 1 ? "team1" : "team0") as Banner["tone"];
  switch (e.type) {
    case "block":
      return { text: pick(["BLOCKED!", "REJECTED!", "GET THAT OUTTA HERE!"], n), sub: nameOf(e.id), tone: "white" };
    case "steal":
      return { text: "STOLEN!", sub: nameOf(e.id), tone: tone(e.id) };
    case "intercept":
      return { text: "PICKED OFF!", sub: nameOf(e.id), tone: tone(e.id) };
    case "knockdown":
      return { text: "BULLDOZED!", sub: nameOf(e.by), tone: tone(e.by) };
    case "foul":
      return { text: "FOUL", sub: `${nameOf(e.id)} on ${nameOf(e.victim)}`, tone: "red" };
    case "shake":
      return e.hard ? { text: pick(["ANKLES!", "SHOOK HIM!", "BROKE HIS ANKLES!"], n), sub: nameOf(e.id), tone: tone(e.id) } : null;
    case "violation":
      return { text: e.reason === "clock" ? "SHOT CLOCK" : "OUT OF BOUNDS", sub: null, tone: "red" };
    case "gamePoint":
      return { text: "GAME POINT", sub: TEAMS[e.team].name, tone: e.team === 0 ? "team0" : "team1" };
    case "win":
      return { text: `${TEAMS[e.team].name.toUpperCase()} WIN!`, sub: `${m.score[e.team]} to ${m.score[e.team === 0 ? 1 : 0]}`, tone: e.team === 0 ? "team0" : "team1" };
    case "go":
      return { text: "GAME ON", sub: "First to 11", tone: "white" };
    default:
      return null;
  }
}
