import { recordFinish } from "./level-board";
import { nameOf } from "./names";
import { record, saveProgress } from "./progress";
import type { Round } from "./round";
import { useCubeStore as store, type HudPlayer, type ResultRow } from "./store";

const HUD_MS = 100;

/**
 * Keeps score for a round: the HUD numbers, a banner for each new best,
 * the saved progress and the level's leaderboard. Bests and finishes are
 * saved the moment they happen, so leaving mid round never loses one.
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
  ended(slot: number, onBest: (text: string | null) => void, pilot = false): void {
    const run = this.round?.run(slot);
    if (!run || !this.round) return;
    const { progress, practice } = store.getState();
    const before = progress.best[this.levelId] ?? 0;
    const percent = run.percent;
    if (practice) return onBest(null);
    if (run.finished) this.finished({ slot, seconds: run.totalTime ?? run.time, attempts: run.attempt, pilot });
    const next = record(progress, this.levelId, percent, false);
    if (next !== progress) {
      saveProgress(next);
      store.setState({ progress: next });
    }
    if (percent > before && percent < 100) {
      const text = `New best ${percent}%`;
      store.setState({ banner: { slot, text, key: ++this.banners } });
      onBest(text);
    } else onBest(null);
  }

  /** Puts a finish on this computer's leaderboard for the level. Practice never gets here. */
  private finished(run: { slot: number; seconds: number; attempts: number; pilot: boolean }): void {
    const { names, placed } = store.getState();
    const { place, entries } = recordFinish(this.levelId, { ...run, name: nameOf(names, run.slot) });
    store.setState({ board: entries, placed: [...placed.filter((p) => p.slot !== run.slot), place] });
  }

  /** The round's rows for the results screen. */
  results(): void {
    const round = this.round;
    if (!round) return;
    const places = round.places(true);
    const rows: ResultRow[] = round.seats.map((seat, i) => ({
      slot: i + 1,
      finished: seat.run.finished,
      // A racer stopped by the other's finish counts how far they got, as their place does.
      best: seat.run.finished ? 100 : Math.max(seat.run.best, seat.run.percent),
      attempts: seat.run.attempt,
      jumps: seat.run.jumps,
      place: places[i]!,
    }));
    // The tags behind the results say the same places and bests as the table.
    const hud = this.hud(round, places).map((player, i) => ({ ...player, best: rows[i]!.best }));
    store.setState({ results: rows, winner: round.winner, hud });
  }

  private hud(round: Round, places = round.places()): HudPlayer[] {
    return round.seats.map((seat, i) => ({
      attempt: seat.run.attempt,
      percent: seat.run.percent,
      best: seat.run.best,
      status: seat.status,
      waiting: seat.status === "run" && round.levelTime(i + 1) < seat.run.time - 0.02,
      mode: seat.run.player.mode,
      place: places[i]!,
    }));
  }
}
