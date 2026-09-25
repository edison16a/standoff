import type { MatchEvent } from "../engine/events";
import { TEAMS } from "../teams";
import type { Banner } from "./host-store";

/** How long each kind of banner stays up, in seconds. */
const LENGTH = { big: 2.6, small: 1.6 } as const;

/**
 * The words across the big screen for the moments that matter: GOAL
 * with the scorer's name, saves, the woodwork, misses, golden goal and
 * full time. A bigger moment replaces a smaller one straight away.
 */
export class Banners {
  current: Banner | null = null;
  private until = 0;
  private next = 1;
  private weight = 0;

  constructor(private readonly nameOf: (athlete: number) => string) {}

  onEvent(event: MatchEvent, time: number): void {
    switch (event.type) {
      case "goal": {
        const team = TEAMS[event.team];
        const sub = event.scorer !== null ? this.nameOf(event.scorer) : `${team.name} score`;
        return this.show({ text: event.golden ? "GOLDEN GOAL" : "GOAL", sub, colour: team.color }, 3, time, LENGTH.big + 0.6);
      }
      case "save":
        if (event.kind === "claim") return;
        return this.show({ text: "SAVE", sub: event.kind === "parry" ? "Pushed away" : "Held on to it", colour: TEAMS[event.team].color }, 2, time, LENGTH.small);
      case "woodwork":
        return this.show({ text: event.part === "post" ? "OFF THE POST" : "OFF THE BAR", sub: null, colour: "#f5f5f5" }, 2, time, LENGTH.small);
      case "miss":
        return this.show({ text: event.kind === "over" ? "OVER THE BAR" : "WIDE", sub: null, colour: "#cbd5e1" }, 1, time, LENGTH.small);
      case "out":
        return this.show({ text: "GOAL KICK", sub: null, colour: "#cbd5e1" }, 0, time, 1.2);
      case "tackle":
        if (!event.won || event.victim === null) return;
        return this.show({ text: "TACKLE", sub: this.nameOf(event.athlete), colour: "#fbbf24" }, 1, time, 1.2);
      case "golden":
        return this.show({ text: "GOLDEN GOAL", sub: "Next goal wins", colour: "#fbbf24" }, 3, time, LENGTH.big);
      case "kickoff":
        return this.show({ text: "KICK OFF", sub: null, colour: "#ffffff" }, 1, time, 1.1);
      case "fulltime":
        return this.show({ text: "FULL TIME", sub: event.winner !== null ? `${TEAMS[event.winner].name} win` : null, colour: event.winner !== null ? TEAMS[event.winner].color : "#fff" }, 3, time, 3);
      default:
        return;
    }
  }

  private show(banner: Omit<Banner, "id">, weight: number, time: number, length: number): void {
    if (this.current && time < this.until && weight < this.weight) return;
    this.current = { ...banner, id: this.next++ };
    this.weight = weight;
    this.until = time + length;
  }

  /** Clears a banner whose time is up. Returns true when that changed anything. */
  expire(time: number): boolean {
    if (!this.current || time < this.until) return false;
    this.current = null;
    return true;
  }

  clear(): void {
    this.current = null;
  }
}
