import type { Ear } from "../audio/mix";
import type { Battle } from "../engine/battle";
import type { Label } from "../render/fighter-view";
import type { Pane } from "../render/layout";
import type { DemoBattle } from "./demo";
import type { MatchDriver } from "./match-driver";

/** What the canvas draws and the sound listens to this frame. */
export interface Scene {
  battle: Battle;
  labels: readonly Label[];
  panes: readonly Pane[];
  ears: readonly Ear[];
}

const TV_ONLY: Pane[] = [{ fighter: null, rect: { x: 0, y: 0, w: 1, h: 1 } }];

/** The match with a view per player, or the demo fight from the television camera. */
export function sceneOf(driver: MatchDriver | null, demo: DemoBattle): Scene {
  if (!driver) return { battle: demo.battle, labels: demo.labels, panes: TV_ONLY, ears: [] };
  const ears = driver.panes.flatMap((p) => (p.fighter === null ? [] : [{ id: p.fighter, pan: (p.rect.x + p.rect.w / 2) * 2 - 1 }]));
  return { battle: driver.battle, labels: driver.labels, panes: driver.panes, ears };
}
