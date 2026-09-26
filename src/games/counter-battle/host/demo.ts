import { playerColor } from "@/games/kit/players";
import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import type { Label } from "../render/fighter-view";
import { buildLineup } from "./lineup";

const MAX_FRAME = 0.1;

/**
 * The fight behind the lobby: four computer players going at it, seen
 * from the television camera, so the big screen shows what the game is
 * while people join. A finished match starts over with a new draw.
 */
export class DemoBattle {
  battle: Battle;
  labels: Label[] = [];
  private carry = 0;
  private seed = Math.floor(Math.random() * 1e9);

  constructor() {
    this.battle = this.fresh();
  }

  advance(realDt: number): BattleEvent[] {
    this.carry += Math.min(MAX_FRAME, Math.max(0, realDt));
    const events: BattleEvent[] = [];
    while (this.carry >= STEP) {
      this.carry -= STEP;
      events.push(...this.battle.step());
    }
    if (this.battle.match.phase === "done") this.battle = this.fresh();
    return events;
  }

  private fresh(): Battle {
    this.seed = (this.seed * 1103515245 + 12345) >>> 0;
    const entries = [0, 0, 1, 1].map((team) => ({ team: team as 0 | 1, seat: null, gun: null }));
    const lineup = buildLineup(entries, () => "", "normal", this.seed);
    this.labels = lineup.setups.map((s, i) => ({ name: s.name, color: lineup.colours[i] ?? playerColor(i + 1) }));
    return new Battle(lineup.setups, this.seed);
  }
}
