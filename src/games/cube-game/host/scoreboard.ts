import { LEVELS } from "../levels";
import { record, saveProgress } from "./progress";
import type { Round } from "./round";
import { useCubeStore as store, type HudPlayer, type ResultRow } from "./store";

const HUD_MS = 100;

/**
 * Keeps score for a round: the HUD numbers, a banner for each new best,
 * and the saved progress. Bests are saved the moment they happen, so
 * leaving mid round never loses one.
 */
export class Scoreboard {
  private round: Round | null = null;
  private levelId = "";
  private lastHud = 0;
  private banners = 0;

  begin(round: Round, levelId: string): void {
    this.round = round;
    this.levelId = levelId;
    this.lastHud = 0;
    store.setState({ hud: this.hud(round) });
  }

  update(round: Round, now: number): void {
    if (now - this.lastHud < HUD_MS) return;
    this.lastHud = now;
    store.setState({ hud: this.hud(round) });
  }

  /** A player's attempt ended, by a crash or the finish. Says if it was a new best. */
  ended(slot: number, onBest: (text: string | null) => void): void {
    const run = this.round?.run(slot);
    if (!run || !this.round) return;
    const { progress, practice } = store.getState();
    const before = progress.best[this.levelId] ?? 0;
    const percent = run.percent;
    if (practice) return onBest(null);
    const index = LEVELS.findIndex((l) => l.info.id === this.levelId);
    const next = record(progress, this.levelId, index, percent, false);
    if (next !== progress) {
      saveProgress(next);
      const opened = next.unlocked > progress.unlocked ? LEVELS[next.unlocked - 1]?.info.name ?? null : null;
      store.setState({ progress: next, unlockedNow: opened ?? store.getState().unlockedNow });
    }
    if (percent > before && percent < 100) {
      const text = `New best ${percent}%`;
      store.setState({ banner: { slot, text, key: ++this.banners } });
      onBest(text);
    } else onBest(null);
  }

  /** The round's rows for the results screen. */
  results(): void {
    const round = this.round;
    if (!round) return;
    const rows: ResultRow[] = round.seats.map((seat, i) => ({
      slot: i + 1,
      finished: seat.run.finished,
      best: seat.run.finished ? 100 : seat.run.best,
      attempts: seat.run.attempt,
      jumps: seat.run.jumps,
    }));
    store.setState({ results: rows, hud: this.hud(round) });
  }

  private hud(round: Round): HudPlayer[] {
    return round.seats.map((seat, i) => ({
      attempt: seat.run.attempt,
      percent: seat.run.percent,
      best: seat.run.best,
      status: seat.status,
      waiting: seat.status === "run" && round.levelTime(i + 1) < seat.run.time - 0.02,
      mode: seat.run.player.mode,
    }));
  }
}
