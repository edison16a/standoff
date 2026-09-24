import { RULES } from "../engine/rules";
import type { Look } from "../render/models/looks";
import type { Banners } from "./banners";
import type { FightDriver } from "./fight-driver";
import type { Hud, HudFighter } from "./host-store";

/** What the overlay shows for a fight right now, read from the driver ten times a second. */
export function hudFrom(driver: FightDriver, looks: readonly [Look, Look], banners: Banners, now: number): Hud {
  const match = driver.match;
  const fighters = ([0, 1] as const).map((id): HudFighter => {
    const f = match.fighters[id];
    const look = looks[id];
    return {
      name: look.name,
      nickname: look.nickname,
      colour: look.gloves,
      health: Math.round((f.health / RULES.maxHealth) * 100),
      stamina: Math.round((f.stamina / RULES.maxStamina) * 100),
      counter: f.counterOpen(match.now) && !f.down,
      blocking: f.blocking(match.now),
      knockdowns: f.knockdowns,
      hurt: match.fighters[id === 0 ? 1 : 0].stats.landed,
      human: driver.slots[id] !== null,
    };
  }) as [HudFighter, HudFighter];
  const downId = match.fighters.findIndex((f) => f.down);
  const down = downId >= 0 ? match.fighters[downId]!.down : null;
  const humans: [boolean, boolean] = [driver.slots[0] !== null, driver.slots[1] !== null];
  return {
    round: match.round,
    rounds: match.rounds,
    clock: match.secondsLeft,
    phase: match.phase,
    stage: driver.stage,
    fighters,
    banners: banners.current(now),
    count: down && down.count > 0 && match.phase !== "over" ? { fighter: downId as 0 | 1, n: down.count, rising: down.risingAt !== null } : null,
    away: driver.pausedFor,
    resumeIn: driver.resumingIn(now),
    phaseLeft: Math.ceil(match.phaseLeft / 1000),
    views: ([0, 1] as const).filter((id) => humans[id]),
  };
}
