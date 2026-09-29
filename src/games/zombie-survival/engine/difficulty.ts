import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { StageSpec } from "./stages";

/** How one difficulty bends every stage: how fast the dead walk and how hard they hit. */
export interface ZombieSkill {
  /** Multiplier on walking speed. 0 means they stand where they appear. */
  speed: number;
  /** Multiplier on what each swing takes off the team. */
  harm: number;
}

/**
 * Medium is the run as tuned and balance tested. Easy gives a new team
 * more time to aim and more health to spare. Hard closes in faster and
 * hits harder. Training zombies stand still and never swing, so players
 * can learn their gun and the weak points.
 */
export const ZOMBIE_SKILL: Record<BotLevel, ZombieSkill> = {
  easy: { speed: 0.82, harm: 0.65 },
  medium: { speed: 1, harm: 1 },
  hard: { speed: 1.15, harm: 1.3 },
  training: { speed: 0, harm: 0 },
};

/** A stage as it plays at this difficulty. Counts and toughness stay, so the run is the same length. */
export function tiltStage(spec: StageSpec, level: BotLevel): StageSpec {
  const skill = ZOMBIE_SKILL[level];
  return { ...spec, speed: spec.speed * skill.speed, harm: spec.harm * skill.harm };
}
