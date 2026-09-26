import type { BattleEvent } from "../engine/events";
import type { FeedEntry } from "./host-store";
import type { MatchDriver } from "./match-driver";

/** How long a kill stays in the feed, and how many show at once. */
const SHOW_MS = 7000;
const MOST = 5;

/** The kill feed in the top corner: who took down whom, with what, and whether it was a head shot. */
export class Feed {
  private list: (FeedEntry & { at: number })[] = [];
  private key = 0;

  add(e: Extract<BattleEvent, { type: "kill" }>, d: MatchDriver, nowMs = performance.now()): void {
    const who = (id: number) => {
      const f = d.battle.fighters[id]!;
      return { name: d.labels[id]!.name, colour: d.labels[id]!.color, team: f.team };
    };
    this.list = [...this.list, { key: ++this.key, killer: who(e.killer), victim: who(e.victim), gun: e.gun, head: e.head, at: nowMs }].slice(-MOST);
  }

  /** The kills still showing, oldest first. */
  entries(nowMs: number): FeedEntry[] {
    this.list = this.list.filter((e) => nowMs - e.at < SHOW_MS);
    return this.list.map((e) => ({ key: e.key, killer: e.killer, victim: e.victim, gun: e.gun, head: e.head }));
  }

  clear(): void {
    this.list = [];
  }
}
