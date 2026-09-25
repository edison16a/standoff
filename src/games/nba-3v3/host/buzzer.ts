import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { BuzzKind } from "../protocol";
import type { PhoneLink } from "./phone-link";

const GRADE_WORDS = { perfect: "Green!", good: "Good release", early: "Early", late: "Late" } as const;

/**
 * Turns game events into buzzes and a flashed word on the phones of the
 * people involved: the shooter hears about their release, the ball
 * handler about a steal, everyone about the whistle and the result.
 */
export class Buzzer {
  constructor(private readonly phones: PhoneLink) {}

  onEvent(e: MatchEvent, m: Match, athleteBySeat: ReadonlyMap<number, number>): void {
    const seatOf = (id: number): number | null => m.athletes[id]?.seat ?? null;
    const send = (id: number, kind: BuzzKind, text: string | null) => {
      const seat = seatOf(id);
      if (seat !== null) this.phones.buzz(seat, kind, text);
    };
    switch (e.type) {
      case "shot":
        if (e.kind === "jumper" || e.kind === "free") send(e.id, e.grade === "perfect" ? "green" : "shot", GRADE_WORDS[e.grade]);
        return;
      case "score":
        send(e.id, e.kind === "dunk" ? "dunk" : "score", e.kind === "dunk" ? "Slam!" : `+${e.points}`);
        if (e.assist !== null) send(e.assist, "score", "Assist!");
        return;
      case "block":
        send(e.id, "block", "Blocked it!");
        send(e.victim, "blocked", "Blocked");
        return;
      case "steal":
      case "intercept":
        send(e.id, "steal", e.type === "steal" ? "Steal!" : "Picked off!");
        send(e.victim, "stolen", "Stolen");
        return;
      case "catch":
        send(e.id, "ball", null);
        return;
      case "rebound":
        send(e.id, "ball", "Rebound!");
        return;
      case "mustClear":
        send(e.id, "whistle", "Take it back first");
        return;
      case "call": {
        const holder = m.holder;
        if (holder && holder.team === m.athletes[e.id]?.team) send(holder.id, "call", "Teammate open!");
        return;
      }
      case "shake":
        send(e.id, "steal", e.hard ? "Ankles!" : "Shook him");
        send(e.victim, "stolen", e.hard ? "Ankles broken" : "Beaten");
        return;
      case "fumble":
        send(e.id, "stolen", "Lost it");
        if (e.by !== null) send(e.by, "steal", "Poked it!");
        return;
      case "foul":
        send(e.id, "whistle", "Foul");
        send(e.victim, "whistle", "Fouled! Two shots");
        return;
      case "freeThrow":
        send(e.id, "ball", `Free throw ${e.n} of 2`);
        return;
      case "violation":
        for (const seat of athleteBySeat.keys()) this.phones.buzz(seat, "whistle", e.reason === "clock" ? "Shot clock" : "Out of bounds");
        return;
      case "win":
        for (const [seat, id] of athleteBySeat) this.phones.buzz(seat, m.athletes[id]?.team === e.team ? "win" : "lose", m.athletes[id]?.team === e.team ? "You win!" : "Good game");
        return;
      default:
        return;
    }
  }
}
