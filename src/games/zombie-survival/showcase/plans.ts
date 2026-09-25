import type { ShowcaseView } from "@/platform/games/game-api";
import type { ShowcasePlan } from "./director";

const TEAM = [
  { weapon: "shotgun", role: "escort" },
  { weapon: "smg", role: "escort" },
  { weapon: "rifle", role: "boss" },
  { weapon: "ak47", role: "boss" },
] as const;

/**
 * The fight each view stages. The clip and the poster share one, so the
 * still shown before the clip starts is the clip's own first frame.
 */
const FIGHT: ShowcasePlan = {
  stage: 5,
  players: TEAM,
  bossAt: 6.5,
  beat: 4,
  escort: { maxAlive: 5, gap: 0.9, spawn: [7, 13] },
  preroll: 5,
  framing: { tilt: 0.1, fov: 58 },
  seed: 7,
};

export const PLANS: Record<ShowcaseView, ShowcasePlan> = {
  loop: FIGHT,
  poster: FIGHT,
  icon: {
    ...FIGHT,
    players: [TEAM[0], TEAM[3]],
    bossAt: 4.8,
    escort: { maxAlive: 2, gap: 1.2, spawn: [8, 12] },
    framing: { tilt: 0.26, fov: 62 },
  },
};
