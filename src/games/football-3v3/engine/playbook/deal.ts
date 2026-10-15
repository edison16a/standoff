import type { Rng } from "../rng";
import { CARRIES, CARRY_WORDS, type CarryKind } from "./carry";
import { DEEP, ROUTE_WORDS, type PlayRoute } from "./shapes";

/**
 * What each of the four runners is in the formation: a runner split
 * wide, the deep threat in the slot, a wing by the line, or on a run
 * call the back beside the QB who takes the pitch.
 */
export type RunnerKind = "wide" | "deep" | "wing" | "back";

/** A play on the card: a name, a route for each runner left to right, and on a run call the back's carry. */
export interface PlayDesign {
  name: string;
  call: "throw" | "run";
  /** One per runner, left to right as the QB looks downfield. The back's entry is "block" and his path is `carry`. */
  routes: PlayRoute[];
  carry: CarryKind | null;
}

/** Plays dealt at a time, and the most deep routes one can have. */
export const DEAL = { size: 6, deepMin: 1, deepMax: 2, tries: 400 } as const;

/** The routes each kind of runner may get on a pass play. */
const POOLS: Record<Exclude<RunnerKind, "back">, readonly PlayRoute[]> = {
  wide: ["go", "fade", "post", "corner", "slant", "out", "dig", "curl", "comeback", "zig"],
  deep: ["go", "post", "seam", "fade", "corner"],
  wing: ["flat", "drag", "curl", "seam", "wheel", "zig", "out"],
};

/** On a run call the wide runners clear defenders out of the way; the rest block. */
const CLEAR_OUTS: readonly PlayRoute[] = ["go", "fade", "post", "slant", "out", "curl"];

/** The short routes that name a play, most eye catching first. */
const FEATURE: readonly PlayRoute[] = ["zig", "wheel", "comeback", "dig", "slant", "drag", "out", "curl", "flat"];

const deepCount = (routes: readonly PlayRoute[]) => routes.filter((r) => DEEP.has(r)).length;

/** A pass play's name: its first deep route and its most eye catching short one, like Post Zig zag. */
function passName(routes: readonly PlayRoute[]): string {
  const deep = routes.find((r) => DEEP.has(r)) ?? "go";
  const short = FEATURE.find((r) => routes.includes(r));
  return short ? `${ROUTE_WORDS[deep]} ${ROUTE_WORDS[short]}` : `${ROUTE_WORDS[deep]} Deep`;
}

/** One pass play, or null when this draw broke a rule: every route different, one or two going deep. */
function drawPass(rng: Rng, kinds: readonly RunnerKind[]): PlayDesign | null {
  const used = new Set<PlayRoute>();
  const routes: PlayRoute[] = [];
  for (const kind of kinds) {
    const pool = (POOLS[kind === "back" ? "wing" : kind]).filter((r) => !used.has(r));
    if (pool.length === 0) return null;
    const route = rng.pick(pool);
    used.add(route);
    routes.push(route);
  }
  const deep = deepCount(routes);
  // A short side (fewer than two runners) cannot have both a deep and a short route, so it gets what it draws.
  const full = routes.length >= 2;
  if ((full && deep < DEAL.deepMin) || deep > DEAL.deepMax || (full && deep === routes.length)) return null;
  return { name: passName(routes), call: "throw", routes, carry: null };
}

/** One run play: the back's carry, clear outs for the wide runners, and blocks for the rest. */
function drawRun(rng: Rng, kinds: readonly RunnerKind[]): PlayDesign {
  const carry = rng.pick(CARRIES);
  const used = new Set<PlayRoute>();
  const routes = kinds.map((kind): PlayRoute => {
    if (kind !== "wide") return "block";
    const route = rng.pick(CLEAR_OUTS.filter((r) => !used.has(r)));
    used.add(route);
    return route;
  });
  const lead = routes.find((r) => r !== "block");
  return { name: lead ? `${CARRY_WORDS[carry]} ${ROUTE_WORDS[lead]}` : CARRY_WORDS[carry], call: "run", routes, carry };
}

/** What makes two plays the same play. */
export const playKey = (p: PlayDesign) => `${p.call}:${p.carry ?? ""}:${p.routes.join(",")}`;

/**
 * Deals a page of plays for a call, each one different, none of them a
 * play in `avoid` (the page before a refresh) when there are enough to
 * go round, and no two with the same name.
 */
export function dealPlays(rng: Rng, call: "throw" | "run", kinds: readonly RunnerKind[], avoid: ReadonlySet<string> = new Set()): PlayDesign[] {
  const out: PlayDesign[] = [];
  const keys = new Set<string>();
  const names = new Set<string>();
  for (let i = 0; i < DEAL.tries && out.length < DEAL.size; i++) {
    const play = call === "run" ? drawRun(rng, kinds) : drawPass(rng, kinds);
    if (!play) continue;
    const key = playKey(play);
    // Late in the tries an old play is let back in rather than deal a short page.
    if (keys.has(key) || names.has(play.name) || (avoid.has(key) && i < DEAL.tries / 2)) continue;
    keys.add(key);
    names.add(play.name);
    out.push(play);
  }
  return out;
}
