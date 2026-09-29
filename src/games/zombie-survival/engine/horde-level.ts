import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { StageSpec } from "./stages";

/**
 * How the dead come at the team at each lobby level: a multiplier on how
 * fast they walk and how hard they hit. Medium is the run as first tuned.
 * Training raises them where they stand: they never walk or swing, so a
 * team can practise its aim.
 */
export const HORDE: Record<BotLevel, { speed: number; harm: number }> = {
  easy: { speed: 0.85, harm: 0.7 },
  medium: { speed: 1, harm: 1 },
  hard: { speed: 1.15, harm: 1.35 },
  training: { speed: 0, harm: 0 },
};

/** A stage as the chosen level plays it. */
export function hordeStage(spec: StageSpec, level: BotLevel): StageSpec {
  const horde = HORDE[level];
  return { ...spec, speed: spec.speed * horde.speed, harm: spec.harm * horde.harm };
}
