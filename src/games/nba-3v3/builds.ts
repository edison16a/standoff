import type { Body, Celebration, DunkStyle, Look, StatId, Stats } from "./roster";

/**
 * The six builds a player picks from. A pick is a way to play, not a
 * person: the player's own name is who they are on the court. Each has
 * its ratings (1 to 10), a body to match, a signature dunk and a
 * celebration. Edit them here and everything follows.
 */
export const BUILD_IDS = ["shooter", "dunker", "playmaker", "lockdown", "big", "allround"] as const;
export type BuildId = (typeof BUILD_IDS)[number];

export interface BuildSpec {
  id: BuildId;
  name: string;
  /** How it plays, in a line for the picker. */
  style: string;
  /** The ratings the build is made around, lit up on the phone. The All Rounder has none. */
  key: readonly StatId[];
  /** Printed on the jersey. */
  number: number;
  stats: Stats;
  body: Body;
  look: Look;
  dunk: DunkStyle;
  dunkName: string;
  celebration: Celebration;
}

const PLAIN = { headband: null, sleeve: null, wristband: null, sock: "#ffffff", mouthguard: false } as const;

export const BUILDS: Record<BuildId, BuildSpec> = {
  shooter: {
    id: "shooter", name: "Shooter", number: 30, key: ["shooting"],
    style: "Deep range and the quickest release. The widest green on the meter.",
    stats: { speed: 8, shooting: 10, strength: 4, passing: 7, defence: 5 },
    body: { height: 1.88, width: 0.92, bulk: 0.9, reach: 0.98 },
    look: { ...PLAIN, skin: "#a86f4c", hair: "short", hairColor: "#1d1510", beard: "stubble", shoe: "#1f3a8a", shoeAccent: "#fbbf24", mouthguard: true },
    dunk: "scoop", dunkName: "Scoop flush", celebration: "night",
  },
  dunker: {
    id: "dunker", name: "Dunker", number: 34, key: ["speed", "strength"],
    style: "Explosive to the rim. Dunks through contact and knocks smaller men over.",
    stats: { speed: 9, shooting: 4, strength: 10, passing: 5, defence: 6 },
    body: { height: 2.06, width: 1.14, bulk: 1.14, reach: 1.08 },
    look: { ...PLAIN, skin: "#4b2e1e", hair: "buzz", hairColor: "#120d0b", beard: "short", wristband: "#fbbf24", shoe: "#00471b", shoeAccent: "#eee1c6" },
    dunk: "windmill", dunkName: "Windmill", celebration: "flex",
  },
  playmaker: {
    id: "playmaker", name: "Playmaker", number: 3, key: ["passing", "speed"],
    style: "Runs the offence. Fast passes nobody picks off, and slippery moves.",
    stats: { speed: 9, shooting: 7, strength: 4, passing: 10, defence: 4 },
    body: { height: 1.84, width: 0.9, bulk: 0.86, reach: 1.0 },
    look: { ...PLAIN, skin: "#ecc6a3", hair: "swept", hairColor: "#6a4527", beard: "short", shoe: "#1d1d1f", shoeAccent: "#38bdf8" },
    dunk: "flush", dunkName: "One hand flush", celebration: "shimmy",
  },
  lockdown: {
    id: "lockdown", name: "Lockdown", number: 23, key: ["defence"],
    style: "Smothers the ball. Quick hands for steals and a hard contest on every shot.",
    stats: { speed: 8, shooting: 5, strength: 7, passing: 5, defence: 10 },
    body: { height: 1.98, width: 1.04, bulk: 1.02, reach: 1.1 },
    look: { ...PLAIN, skin: "#5b3a26", hair: "buzz", hairColor: "#151010", beard: "full", headband: "#ffffff", shoe: "#fdb927", shoeAccent: "#552583" },
    dunk: "tomahawk", dunkName: "Tomahawk", celebration: "roar",
  },
  big: {
    id: "big", name: "Big Man", number: 1, key: ["strength", "defence"],
    style: "Owns the paint. The longest arms for blocks and boards, and a wall to drive into.",
    stats: { speed: 5, shooting: 4, strength: 10, passing: 6, defence: 9 },
    body: { height: 2.2, width: 1.12, bulk: 1.16, reach: 1.14 },
    look: { ...PLAIN, skin: "#5b3925", hair: "curly", hairColor: "#130e0b", beard: "none", wristband: "#c4ced4", shoe: "#111111", shoeAccent: "#c4ced4", sock: "#111111" },
    dunk: "hammer", dunkName: "Two hand hammer", celebration: "reach",
  },
  allround: {
    id: "allround", name: "All Rounder", number: 7, key: [],
    style: "Good at everything and best at nothing. Fits any team.",
    stats: { speed: 7, shooting: 7, strength: 7, passing: 7, defence: 7 },
    body: { height: 2.01, width: 0.98, bulk: 0.96, reach: 1.04 },
    look: { ...PLAIN, skin: "#5e3b26", hair: "twists", hairColor: "#141010", beard: "goatee", sleeve: { side: -1, color: "#111111" }, shoe: "#e5e7eb", shoeAccent: "#ce1141" },
    dunk: "reverse", dunkName: "Reverse slam", celebration: "calm",
  },
};

export function isBuildId(value: string): value is BuildId {
  return (BUILD_IDS as readonly string[]).includes(value);
}

/** What a computer player is called: CPU and its build, like CPU Shooter. */
export function cpuName(id: BuildId): string {
  return `CPU ${BUILDS[id].name}`;
}
