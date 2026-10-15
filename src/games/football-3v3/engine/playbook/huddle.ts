import type { Match } from "../match";
import { pickBack } from "../run-play";
import type { Athlete } from "../types";
import { carryPoints } from "./carry";
import { dealPlays, playKey, type PlayDesign } from "./deal";
import { kindOf, playRunners } from "./runners";
import { outOf, playRoutePoints, SETTLES } from "./shapes";

/**
 * The play call's second step. Once a person's QB picks Throw or Run
 * his phone shows a page of plays drawn for his own runners; he picks
 * one, or deals a fresh page. A computer QB picks from a page of his own
 * at once. Only computer runners run what the card draws: a person's
 * runner is free to go where he likes.
 */
export interface Huddle {
  call: "throw" | "run";
  plays: PlayDesign[];
  /** The runners the page was drawn for, left to right, and the back on a run call. */
  runners: number[];
  back: number | null;
  /** Match time the page went up, for its clock. A fresh page keeps the clock running. */
  at: number;
}

export const HUDDLE = {
  /** Seconds to pick a play before the first one on the page is called. */
  seconds: 12,
} as const;

/** A fresh page of plays for a call, for the offense's runners as they line up now. */
export function dealHuddle(m: Match, call: "throw" | "run", avoid: ReadonlySet<string> = new Set()): Huddle {
  const back = call === "run" ? pickBack(m.athletes, m.offense) : null;
  const runners = playRunners(m, m.offense);
  const plays = dealPlays(m.playRng, call, runners.map((r) => kindOf(r, back)), avoid);
  return { call, plays, runners: runners.map((r) => r.id), back, at: m.time };
}

/** A new page in place of the one up, with none of its plays on it. */
export function redeal(m: Match, h: Huddle): Huddle {
  return { ...dealHuddle(m, h.call, new Set(h.plays.map(playKey))), at: h.at };
}

/** Seconds left on the page's clock. */
export const huddleLeft = (h: Huddle, now: number) => Math.max(0, HUDDLE.seconds - (now - h.at));

/**
 * Gives each runner the route the play draws for him, from where he
 * lined up, and the back his carry. People's runners get theirs too, so
 * one whose phone drops runs the play.
 */
export function applyDesign(m: Match, design: PlayDesign, runners: readonly Athlete[], qb: Athlete): void {
  const back = m.play?.back ?? null;
  runners.forEach((r, i) => {
    r.bot.leg = 0;
    if (r.id === back && design.carry) {
      r.bot.route = carryPoints(design.carry, r, qb.z, m.sign);
      r.bot.stop = false;
      return;
    }
    const kind = design.routes[i] ?? "block";
    r.bot.route = playRoutePoints(kind, r, m.sign, outOf(r.z, m.drive.ballZ));
    r.bot.stop = SETTLES.has(kind);
  });
}
