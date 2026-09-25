import type { StageRenderer } from "@/games/fencing/render/stage-renderer";
import { ShowcaseBout } from "./showcase-bout";

/** One pass of the bout, then it starts again. The capture tool records exactly one. */
const CYCLE_MS = 8000;
/** The capture tool warms up this long before recording, so the cycle is lined up to start there. */
const WARMUP_MS = 3000;
/** After the burst the bout holds still, so the loop ends on the moment, not on a reset. */
const FREEZE_AFTER_IMPACT_MS = 1300;
const STEP_MS = 1000 / 60;
/** The clip is recorded at 30 frames a second, so drawing more often only slows the capture. */
const DRAW_EVERY_MS = 30;

const CAST = { 1: "vale", 2: "marrow" } as const;

/**
 * The looping clip: a fresh bout every cycle, frozen after its burst.
 *
 * `seekMs` starts the clip that far in, as if it had been playing all
 * along: the skipped time is stepped through exactly as it would have
 * played, only without drawing. Software capture can then record the clip
 * in pieces side by side.
 */
export function clip(renderer: StageRenderer, seekMs = 0): (now: number) => void {
  let start: number | null = null;
  let cycle = -1;
  let bout: ShowcaseBout | null = null;
  let impactAt: number | null = null;
  let last = 0;
  let drawnAt = -Infinity;
  /** The time of the tick being played, which the bout's events are stamped with. */
  let tickAt = 0;

  const tick = (now: number, draw: boolean) => {
    tickAt = now;
    start ??= now;
    const elapsed = now - start + CYCLE_MS - WARMUP_MS;
    const index = Math.floor(elapsed / CYCLE_MS);
    if (index !== cycle) {
      cycle = index;
      impactAt = null;
      renderer.reset();
      bout = new ShowcaseBout(CAST, (event) => {
        if (event.type === "impact") impactAt = tickAt;
        renderer.react(event, tickAt);
      });
      last = now;
    }
    const frozen = impactAt !== null && now - impactAt > FREEZE_AFTER_IMPACT_MS;
    // The capture tool steps the clock in whole frames; catch up in fixed steps so every run is identical.
    while (last + STEP_MS <= now) {
      last += STEP_MS;
      if (!frozen) bout!.step(STEP_MS);
    }
    renderer.update(bout!.scene(), now, { scores: bout!.scores });
    if (!draw || now - drawnAt < DRAW_EVERY_MS) return;
    drawnAt = now;
    renderer.draw();
  };

  let sought = seekMs <= 0;
  return (now) => {
    if (!sought) {
      sought = true;
      for (let t = now - seekMs; t < now; t += STEP_MS) tick(t, false);
    }
    tick(now, true);
  };
}

/** A clip start asked for with `?fseek=` in milliseconds, for capturing in pieces. */
export function readSeek(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, Number(new URLSearchParams(window.location.search).get("fseek") ?? 0) || 0);
}
