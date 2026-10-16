import type { Match } from "../engine/match";
import type { BannerText } from "./callouts";

/** Game seconds after a basket for the ball to drop through the net before a banner may show. */
export const SETTLE = 0.6;
/** A banner never waits longer than this, so a call still lands while it means something. */
export const MAX_WAIT = 2.5;

/** True while the ball is on its way to the hoop: a shot in the air or on the iron, or a finish going up. */
export function ballAtHoop(m: Match): boolean {
  const b = m.ball;
  const shotLive = b.mode === "flight" && (b.flightKind === "shot" || b.flightKind === "dunk") && b.shot !== null && !b.shot.counted;
  return shotLive || m.athletes.some((a) => a.action.kind === "drive");
}

/**
 * Holds a banner back while the ball is going to the hoop and just after
 * it drops, so no words ever sit over the ball going in. A newer banner
 * replaces a held one, as on the board itself.
 */
export class BannerGate {
  private held: { banner: BannerText; since: number } | null = null;
  private basketAt = Number.NEGATIVE_INFINITY;

  /** A basket counted now: the net gets its moment first. */
  basket(time: number): void {
    this.basketAt = time;
  }

  /** The banner to show now, or null when it is held for later. */
  offer(banner: BannerText, m: Match): BannerText | null {
    if (this.clear(m)) {
      this.held = null;
      return banner;
    }
    this.held = { banner, since: m.time };
    return null;
  }

  /** Called every frame: the held banner once the ball is through, or after the longest wait. */
  release(m: Match): BannerText | null {
    const held = this.held;
    if (!held || (!this.clear(m) && m.time - held.since < MAX_WAIT)) return null;
    this.held = null;
    return held.banner;
  }

  /** The replay or the ceremony took the screen: a held banner is stale. */
  drop(): void {
    this.held = null;
  }

  private clear(m: Match): boolean {
    // A clock behind the last basket is a new game.
    const settling = m.time >= this.basketAt && m.time - this.basketAt < SETTLE;
    return !settling && !ballAtHoop(m);
  }
}
