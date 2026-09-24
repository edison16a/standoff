import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { CHARACTERS, TEAMS } from "../roster";
import type { Banner } from "./host-store";

export interface Callout {
  banner: Omit<Banner, "key"> | null;
  /** What the announcer says, or null to stay quiet. */
  say: string | null;
}

const pick = <T,>(options: readonly T[], n: number): T => options[Math.abs(n) % options.length]!;

/**
 * The words for the big moments: the banner across the screen and the
 * announcer's line, from the event and who made it happen. `nameOf` gives
 * the name the room knows a player by. `n` varies the wording.
 */
export function callout(e: MatchEvent, m: Match, nameOf: (id: number) => string, n: number): Callout | null {
  const who = (id: number) => nameOf(id);
  const tone = (id: number) => (m.athletes[id]?.team === 1 ? "team1" : "team0") as Banner["tone"];
  switch (e.type) {
    case "score": {
      const name = who(e.id);
      if (e.kind === "dunk") {
        const style = CHARACTERS[m.athletes[e.id]!.character].dunkName;
        return { banner: { text: pick(["DUNK!", "SLAM!", "POSTERIZED!"], n), sub: `${name}, ${style.toLowerCase()}`, tone: "gold" }, say: pick([`${name} throws it down!`, "Oh, what a slam!", `${name} with the jam!`], n) };
      }
      if (e.points === 3) {
        const text = e.outcome === "swish" ? pick(["SPLASH!", "FROM DOWNTOWN!"], n) : "THREE!";
        return { banner: { text, sub: name, tone: tone(e.id) }, say: e.outcome === "swish" ? pick([`${name} from downtown!`, "Bang! Nothing but net!", "Splash!"], n) : pick([`${name} for three!`, "Three!"], n) };
      }
      const words: Record<string, [string, string]> = {
        swish: ["SWISH!", "Swish!"],
        bank: ["OFF THE GLASS!", "Off the glass!"],
        roll: ["IT ROLLS IN!", "It rolls around and in!"],
        bounce: ["FRIENDLY BOUNCE!", "A friendly bounce!"],
      };
      const [text, line] = e.kind === "layup" ? ["LAYUP!", pick(["Easy two.", `${name} lays it in.`], n)] : (words[e.outcome] ?? ["BUCKET!", "Good!"]);
      return { banner: { text, sub: name, tone: tone(e.id) }, say: e.streak >= 3 ? null : line };
    }
    case "block":
      return { banner: { text: pick(["BLOCKED!", "REJECTED!", "GET THAT OUTTA HERE!"], n), sub: who(e.id), tone: "white" }, say: pick(["Blocked!", `Rejected by ${who(e.id)}!`, "Get that out of here!"], n) };
    case "steal":
      return { banner: { text: "STOLEN!", sub: who(e.id), tone: tone(e.id) }, say: pick(["Stolen!", `${who(e.id)} with the steal!`], n) };
    case "intercept":
      return { banner: { text: "PICKED OFF!", sub: who(e.id), tone: tone(e.id) }, say: "Picked off!" };
    case "knockdown":
      return { banner: { text: "BULLDOZED!", sub: who(e.by), tone: tone(e.by) }, say: null };
    case "heating":
      return { banner: { text: "HEATING UP", sub: who(e.id), tone: "gold" }, say: `${who(e.id)} is heating up!` };
    case "onFire":
      return { banner: { text: "ON FIRE!", sub: who(e.id), tone: "red" }, say: `${who(e.id)} is on fire!` };
    case "violation":
      return { banner: { text: e.reason === "clock" ? "SHOT CLOCK" : "OUT OF BOUNDS", sub: null, tone: "red" }, say: null };
    case "gamePoint":
      return { banner: { text: "GAME POINT", sub: TEAMS[e.team].name, tone: e.team === 0 ? "team0" : "team1" }, say: "Game point!" };
    case "win":
      return { banner: { text: `${TEAMS[e.team].name.toUpperCase()} WIN!`, sub: `${m.score[e.team]} to ${m.score[e.team === 0 ? 1 : 0]}`, tone: e.team === 0 ? "team0" : "team1" }, say: pick(["Ball game!", `And that's the game! ${TEAMS[e.team].name} win it!`], n) };
    case "go":
      return { banner: { text: "GAME ON", sub: "First to 11", tone: "white" }, say: "Let's go!" };
    default:
      return null;
  }
}
