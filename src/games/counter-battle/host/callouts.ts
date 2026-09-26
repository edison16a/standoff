import type { BattleEvent } from "../engine/events";
import type { TeamId } from "../engine/fighter";
import { RULES } from "../engine/tuning";
import type { Banner } from "./host-store";

/** What a moment puts on the big screen and in the announcer's mouth. */
export interface Callout {
  banner?: Omit<Banner, "key">;
  say?: { text: string; priority: number };
}

export interface CalloutContext {
  roundsToWin: number;
  /** A side as the screen names it: the player in one against one, the team in two against two. */
  sideName(team: TeamId): string;
  /** Whether a fighter is played from a phone. */
  isHuman(id: number): boolean;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** A number as the announcer says it. */
export const spoken = (n: number): string => WORDS[n] ?? String(n);

/** Round wins either side needs no more than one more of. */
function matchPoint(score: readonly [number, number], toWin: number): string | null {
  const a = score[0] === toWin - 1;
  const b = score[1] === toWin - 1;
  return a && b ? "Decider" : a || b ? "Match point" : null;
}

/**
 * The words for each moment of the match: the round banner and count in,
 * Fight, who took the round, and the winner. Head shot kills by players
 * get a shout too. Everything else speaks for itself on screen.
 */
export function callout(e: BattleEvent, score: readonly [number, number], c: CalloutContext): Callout | null {
  switch (e.type) {
    case "countdown": {
      // The count in starts with the round's banner; the numbers after it only beep.
      // The first round starts counting already, so the host calls its start itself.
      if (e.seconds !== RULES.countdown) return null;
      const point = matchPoint(score, c.roundsToWin);
      return {
        banner: { text: `Round ${e.round}`, sub: point ?? `${score[0]} to ${score[1]}`, tone: "white" },
        say: { text: point === "Decider" ? "Final round" : point ? `Round ${spoken(e.round)}. Match point` : `Round ${spoken(e.round)}`, priority: 2 },
      };
    }
    case "fight":
      return { banner: { text: "Fight", sub: null, tone: "white" }, say: { text: "Fight!", priority: 2 } };
    case "round-end": {
      if (e.winner === null) return { banner: { text: "Draw", sub: "Nobody takes the round", tone: "white" }, say: { text: "Draw", priority: 2 } };
      const side = c.sideName(e.winner);
      // The last round's banner is the match's; the round itself goes unsaid.
      if (e.score[e.winner] >= c.roundsToWin) return null;
      return { banner: { text: `${side} takes it`, sub: `${e.score[0]} to ${e.score[1]}`, tone: e.winner }, say: { text: `${side} takes the round`, priority: 2 } };
    }
    case "match-end": {
      const side = c.sideName(e.winner);
      return { banner: { text: `${side} wins`, sub: `${e.score[0]} to ${e.score[1]}`, tone: e.winner }, say: { text: `${side} wins the match!`, priority: 3 } };
    }
    case "kill":
      if (e.head && c.isHuman(e.killer)) return { say: { text: "Head shot!", priority: 1 } };
      return null;
    default:
      return null;
  }
}
