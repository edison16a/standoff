import type { Announcer } from "../audio/announcer";
import type { BattleEvent } from "../engine/events";
import type { TeamId } from "../engine/fighter";
import { RULES } from "../engine/tuning";
import { TEAMS } from "../teams";
import { buzzesFor } from "./buzz";
import { callout, type Callout, type CalloutContext } from "./callouts";
import { Feed } from "./feed";
import { useCounterStore as store } from "./host-store";
import type { MatchDriver } from "./match-driver";
import type { PhoneLink } from "./phone-link";

const BANNER_MS = 2300;

/** Events that change what the HUD or a phone shows straight away. */
const URGENT: readonly BattleEvent["type"][] = ["kill", "hit", "fight", "round-end", "match-end", "countdown", "reload-start", "reloaded", "shot"];

/**
 * What each moment of a match means beyond the drawing and the sound:
 * which phones buzz, the kill feed, the round banners and the
 * announcer's calls.
 */
export class Moments {
  readonly feed = new Feed();
  private key = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly phones: PhoneLink,
    private readonly announcer: Announcer,
    /** Asks the session to publish now, when a banner comes down. */
    private readonly changed: () => void,
  ) {}

  /** A new match: the first round is already counting in, so its banner is called here. */
  start(d: MatchDriver): void {
    this.feed.clear();
    this.call(callout({ type: "countdown", round: 1, seconds: RULES.countdown }, d.battle.match.score, context(d)));
  }

  /** Handles one event. True when the screens should be refreshed now rather than on the next beat. */
  event(e: BattleEvent, d: MatchDriver): boolean {
    for (const b of buzzesFor(e, d.battle.fighters)) this.phones.buzz(b.seat, b.kind);
    if (e.type === "kill") this.feed.add(e, d);
    this.call(callout(e, d.battle.match.score, context(d)));
    // Only a player's own shots change their phone's count; the rest wait for the beat.
    if (e.type === "shot") return d.battle.fighters[e.shooter]?.seat !== null;
    return URGENT.includes(e.type);
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private call(c: Callout | null): void {
    if (!c) return;
    if (c.say) this.announcer.say(c.say.text, c.say.priority);
    if (!c.banner) return;
    const key = ++this.key;
    store.setState({ banner: { ...c.banner, key } });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (store.getState().banner?.key === key) store.setState({ banner: null });
      this.changed();
    }, BANNER_MS);
  }
}

function context(d: MatchDriver): CalloutContext {
  return {
    roundsToWin: d.battle.match.roundsToWin,
    // One against one, a side is its player; two against two, its team.
    sideName: (team: TeamId) => {
      const side = d.battle.fighters.filter((f) => f.team === team);
      return side.length === 1 ? d.labels[side[0]!.id]!.name : `${TEAMS[team].name} team`;
    },
    isHuman: (id: number) => d.battle.fighters[id]?.seat !== null,
  };
}
