import { createMatch, stepMatch } from "../engine/match";
import { Rng } from "../engine/rng";
import { pickStage } from "../engine/stages";
import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { CHARACTER_IDS } from "../roster";

/**
 * Four computer fighters brawling behind the lobby, so the big screen is
 * alive while people join. When one match ends another starts on a new
 * stage. It makes no sound.
 */
export class DemoMatch {
  state: MatchState;
  private carry = 0;
  private round = 0;

  constructor(private readonly seed = Math.floor(Math.random() * 1e9)) {
    this.state = this.next();
  }

  get alpha(): number {
    return Math.min(1, this.carry / STEP);
  }

  advance(realDt: number, before: () => void, after: () => void): number {
    if (this.state.phase === "over") this.state = this.next();
    const dt = Math.min(0.1, Math.max(0, realDt));
    this.carry += dt;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      before();
      stepMatch(this.state);
      after();
    }
    return dt;
  }

  private next(): MatchState {
    const rng = new Rng(this.seed + this.round++ * 7919);
    const entrants = CHARACTER_IDS.map((character) => ({ character, seat: null }));
    return createMatch(entrants, { seed: this.seed + this.round, stage: pickStage(rng), difficulty: "hard" });
  }
}
