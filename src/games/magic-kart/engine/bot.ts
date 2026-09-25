import { botPedals } from "./bot-pedals";
import type { Cube } from "./pickups";
import type { Kart, KartInput } from "./kart";
import type { Obstacle } from "./obstacles";
import { nearestAhead } from "./projectiles";
import { wrapAngle } from "@/games/kit/motion/math3d";
import type { Track } from "./track";

/** A computer driver's own plans, kept between steps. */
export interface BotBrain {
  /** The line it likes to hold, as an offset from the centre. */
  lane: number;
  laneTimer: number;
  /** Seconds until it thinks about using its item. */
  itemTimer: number;
}

export interface BotView {
  track: Track;
  karts: readonly Kart[];
  cubes: readonly Cube[];
  obstacles: readonly Obstacle[];
  /** True if a throw is chasing this kart right now. */
  chased: boolean;
}

export function createBrain(random: () => number): BotBrain {
  return { lane: (random() - 0.5) * 6, laneTimer: 2 + random() * 4, itemTimer: 1 + random() * 3 };
}

/** The lane to aim for: an item cube when empty handed, and never an obstacle. */
function chooseLane(kart: Kart, brain: BotBrain, view: BotView): number {
  const { track } = view;
  const room = track.halfWidth - 2.2;
  let lane = brain.lane;
  if (!kart.item) {
    let best = Infinity;
    for (const cube of view.cubes) {
      const ahead = track.forward(kart.loc.s, cube.s);
      if (cube.respawnAt > 0 || ahead < 8 || ahead > 45) continue;
      const shift = Math.abs(cube.d - kart.loc.d);
      if (shift < best) {
        best = shift;
        lane = cube.d;
      }
    }
  }
  for (const o of view.obstacles) {
    const ahead = track.forward(kart.loc.s, o.s);
    if (ahead < 0 || ahead > 34) continue;
    const clearance = o.def.radius + 2.8 + (o.def.sweep ? o.def.sweep.amplitude * 0.4 : 0);
    if (Math.abs(lane - o.d) < clearance) lane = o.d + (lane >= o.d ? 1 : -1) * clearance;
    // Hemmed against the edge, go round the other side instead.
    if (Math.abs(lane) > room) lane = o.d - Math.sign(lane) * clearance;
  }
  return Math.max(-room, Math.min(room, lane));
}

function wantsItem(kart: Kart, view: BotView): boolean {
  switch (kart.item) {
    case "orb":
    case "ice": {
      const target = nearestAhead(kart, view.karts);
      return target !== null && target.race.progress - kart.race.progress < 90;
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
 * A simple, readable computer driver. It steers at a point a little way
 * down its chosen lane, drifts or lifts off for bends, weaves for item cubes
 * and around obstacles, and uses items when they are likely to help.
 */
export function think(kart: Kart, brain: BotBrain, view: BotView, time: number, dt: number, random: () => number): { input: KartInput; use: boolean } {
  const { track } = view;
  brain.laneTimer -= dt;
  if (brain.laneTimer <= 0) {
    brain.lane = (random() - 0.5) * (track.halfWidth * 1.1);
    brain.laneTimer = 3 + random() * 4;
  }
  const speed = Math.hypot(kart.vx, kart.vz);
  const lane = chooseLane(kart, brain, view);
  const look = 7 + speed * 0.42;
  const aim = track.pointAt(kart.loc.s + look, lane);
  const wanted = Math.atan2(aim.x - kart.x, aim.z - kart.z);
  const diff = wrapAngle(wanted - kart.heading);
  const steer = Math.max(-1, Math.min(1, -diff * 2.4));

  const { throttle, brake } = botPedals(kart, track, steer, speed);

  let use = false;
  if (kart.item && time >= kart.itemReadyAt) {
    brain.itemTimer -= dt;
    if (brain.itemTimer <= 0) {
      use = wantsItem(kart, view);
      brain.itemTimer = use ? 1.5 + random() * 3 : 0.7;
    }
  }
  return { input: { steer, throttle, brake }, use };
}
