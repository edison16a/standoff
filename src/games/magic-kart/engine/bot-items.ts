import type { BotView } from "./bot";
import { currentItem, queuedItem, roomFor } from "./item-queue";
import type { Kart } from "./kart";
import { nearestAhead, nearestBehind } from "./projectiles";

/** Boxes this far ahead, in metres, are worth steering for. */
const SEEK_FROM = 8;
const SEEK_TO = 45;
/** An empty handed driver treats a double box as this many metres nearer its line, since it is worth two. */
const DOUBLE_PULL = 3;
/** A full hand with a box this close ahead fires its front item to make room. */
const MAKE_ROOM = 30;

/**
 * The lane to steer for to reach a box, or null when there is no box
 * worth having. A driver with room in hand heads for the nearest box
 * across the road, and one with nothing at all leans towards a double.
 * A full hand would only pass through, so it does not bother.
 */
export function boxLane(kart: Kart, view: BotView): number | null {
  const room = roomFor(kart);
  if (room === 0) return null;
  let best = Infinity;
  let lane: number | null = null;
  for (const cube of view.cubes) {
    const ahead = view.track.forward(kart.loc.s, cube.s);
    if (cube.respawnAt > 0 || ahead < SEEK_FROM || ahead > SEEK_TO) continue;
    const pull = room === 2 && cube.count === 2 ? DOUBLE_PULL : 0;
    const cost = Math.abs(cube.d - kart.loc.d) - pull;
    if (cost < best) {
      best = cost;
      lane = cube.d;
    }
  }
  return lane;
}

/** A box is coming up that a full hand would waste. */
function boxSoon(kart: Kart, view: BotView): boolean {
  return view.cubes.some((cube) => {
    const ahead = view.track.forward(kart.loc.s, cube.s);
    return cube.respawnAt === 0 && ahead > 0 && ahead < MAKE_ROOM;
  });
}

/** Whether the front item is worth firing on its own merits right now. */
function goodMoment(kart: Kart, view: BotView): boolean {
  switch (currentItem(kart)?.kind) {
    case "orb": {
      const target = nearestAhead(kart, view.karts);
      return target !== null && target.race.progress - kart.race.progress < 90;
    }
    case "ice": {
      // The leader has no one ahead, so its ice goes back at whoever is chasing.
      const target = nearestAhead(kart, view.karts) ?? nearestBehind(kart, view.karts);
      return target !== null && Math.abs(target.race.progress - kart.race.progress) < 90;
    }
    case "nitro":
      return Math.abs(view.track.sharpestAhead(kart.loc.s, 60)) < 0.02;
    case "shield":
      return view.chased || kart.timers.shield <= 0;
    case "ghost":
      return true;
    default:
      return false;
  }
}

/**
 * Whether a computer driver fires its front item now. Besides a good
 * moment for the item itself, the queue gives two more reasons: a full
 * hand with a box just ahead fires to make room (keeping a shield that
 * is already up), and a driver with a throw on its tail fires whatever
 * is in front to bring a queued shield forward in time.
 */
export function wantsItem(kart: Kart, view: BotView): boolean {
  const first = currentItem(kart);
  if (!first) return false;
  if (goodMoment(kart, view)) return true;
  if (view.chased && queuedItem(kart)?.kind === "shield") return true;
  const shieldUp = first.kind === "shield" && kart.timers.shield > 0;
  return roomFor(kart) === 0 && !shieldUp && boxSoon(kart, view);
}
