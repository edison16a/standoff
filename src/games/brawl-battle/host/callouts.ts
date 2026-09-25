import type { MatchEvent } from "../engine/events";
import { moveOf } from "../engine/moves";
import type { MatchState } from "../engine/types";

export interface Callout {
  /** A line for the announcer, and how much it matters (see Announcer.say). */
  say?: { text: string; priority: number };
  /** A strip across the screen, in the fighter's colour. */
  banner?: { text: string; sub: string | null; fighter: number | null };
}

const KO_LINES = ["Knockout!", "K O!", "Smash!", "What a hit!", "Sent flying!"];

/**
 * What the announcer says and the screen shows for a moment in the
 * match. `nameOf` gives a fighter's display name; `turn` picks between
 * lines so the same one does not repeat every time.
 */
export function callout(e: MatchEvent, m: MatchState, nameOf: (id: number) => string, turn: number): Callout | null {
  switch (e.type) {
    case "countdown":
      return { say: e.call === "ready" ? { text: "Ready?", priority: 2 } : { text: "Fight!", priority: 2 } };
    case "ko": {
      const name = nameOf(e.id);
      const by = e.by !== null ? nameOf(e.by) : null;
      // The KO that ends the match is left to "Game!".
      const alive = m.fighters.filter((f) => f.stocks > 0).length;
      if (e.stocksLeft === 0 && alive <= 1) return null;
      if (e.stocksLeft === 0) return { say: { text: `${name} is out!`, priority: 2 }, banner: { text: `${name} is out`, sub: by ? `Finished by ${by}` : null, fighter: e.id } };
      return {
        say: { text: KO_LINES[turn % KO_LINES.length]!, priority: 1 },
        banner: { text: "KO", sub: by ? `${by} knocked out ${name}` : `${name} fell`, fighter: e.by ?? e.id },
      };
    }
    case "ult": {
      const f = m.fighters[e.id];
      if (!f) return null;
      const move = moveOf(f.character, "ult").name;
      return { say: { text: `${move}!`, priority: 1 }, banner: { text: move, sub: nameOf(e.id), fighter: e.id } };
    }
    case "shieldBreak":
      return { say: { text: "Shield break!", priority: 0 } };
    case "game":
      return { say: { text: "Game!", priority: 2 } };
    case "over":
      return { say: { text: m.winner === null ? "It's a draw!" : `${nameOf(m.winner)} wins!`, priority: 2 } };
    default:
      return null;
  }
}
