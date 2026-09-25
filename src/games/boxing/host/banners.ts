import type { MatchEvent } from "../engine/events";
import { RULES } from "../engine/rules";
import type { Banner } from "./host-store";

/** How long a banner stays up, in milliseconds. */
const LIFE_MS = 1_300;

/**
 * The words that pop up over the fight: the round, FIGHT, a block, a
 * slip, a counter, a knockdown. Each is aimed at the view of the boxer
 * it matters to, so in split screen each player sees their own.
 */
export class Banners {
  private list: (Banner & { at: number })[] = [];
  private next = 1;

  onEvent(event: MatchEvent, now: number, humans: readonly [boolean, boolean]): void {
    const say = (text: string, tone: Banner["tone"], fighter: 0 | 1 | null) => {
      // A computer boxer has no view, so its own messages are not shown.
      if (fighter !== null && !humans[fighter]) return;
      this.list.push({ id: this.next++, text, tone, fighter, at: now });
    };
    switch (event.type) {
      case "round":
        say(event.round === RULES.rounds ? "FINAL ROUND" : `ROUND ${event.round}`, "info", null);
        break;
      case "touch":
        if (!event.timedOut) say("GLOVES TOUCHED", "good", null);
        break;
      case "bell":
        if (event.kind === "start") say("FIGHT!", "big", null);
        break;
      case "warning":
        say("5 SECONDS", "info", null);
        break;
      case "hit":
        if (event.stagger) {
          say(event.counter ? "COUNTER!" : "BIG SHOT!", "good", event.fighter);
          say("STUNNED", "bad", event.target);
        } else if (event.counter) say("COUNTER", "good", event.fighter);
        else if (event.heavy) say("BIG SHOT", "good", event.fighter);
        else if (event.cover >= 0.4) say("HALF BLOCKED", "good", event.target);
        else if (event.level === "body") say("BODY SHOT", "good", event.fighter);
        break;
      case "block":
        say("BLOCKED", "good", event.target);
        break;
      case "miss":
        if (event.dodge === "duck") say("DUCKED", "good", event.target);
        if (event.dodge === "slip") say("SLIPPED", "good", event.target);
        break;
      case "throw":
        if (event.tired) say("TIRED", "bad", event.fighter);
        break;
      case "knockdown":
        say("KNOCKDOWN!", "big", null);
        break;
      case "stoppage":
        say(event.method === "KO" ? "K.O.!" : "T.K.O.!", "big", null);
        break;
      case "over":
        if (event.result.method === "Decision") say("DECISION", "big", null);
        if (event.result.method === "Draw") say("DRAW", "big", null);
        break;
      default:
        break;
    }
  }

  /** The banners still showing. */
  current(now: number): Banner[] {
    this.list = this.list.filter((b) => now - b.at < LIFE_MS).slice(-4);
    return this.list.map(({ id, text, tone, fighter }) => ({ id, text, tone, fighter }));
  }

  clear(): void {
    this.list = [];
  }
}
