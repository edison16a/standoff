import type { StageRenderer } from "@/games/fencing/render/stage-renderer";
import { ShowcaseBout } from "./showcase-bout";

/** One pass of the bout, then it starts again. The capture tool records exactly one. */
const CYCLE_MS = 8000;
/** The capture tool warms up this long before recording, so the cycle is lined up to start there. */
const WARMUP_MS = 3000;
/**
 * After the burst the bout holds still, so the loop ends on the moment. The
 * referee calls the next en garde about 1.2 seconds after it, which must
 * never make it into the clip.
 */
const FREEZE_AFTER_IMPACT_MS = 900;
/** The opening footwork is skipped, so the clip starts a beat before the first attack. */
const PRE_ROLL_MS = 1000;
const STEP_MS = 1000 / 60;
/** The clip is recorded at 30 frames a second, so drawing more often only slows the capture. */
const DRAW_EVERY_MS = 30;
/** How often the capture tool checks whether the page is ready. */
const READY_POLL_MS = 50;
/** The capture tool's faked animation frames come this far apart, so skipped time is stepped the same way. */
const FAKE_FRAME_MS = 16;
/**
 * The hall, the crowd and the camera are driven by a clock that starts with
 * the clip, not the page. Two captures of the same moment then look the
 * same, however long each page took to load.
 */
const CLIP_CLOCK_BASE_MS = 60_000;

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
  /** The clip clock at the tick being played, which the bout's events are stamped with. */
  let tickAt = 0;

  const tick = (now: number, draw: boolean) => {
    tickAt = now - start! + CLIP_CLOCK_BASE_MS;
    const elapsed = now - start! + CYCLE_MS - WARMUP_MS;
    const index = Math.floor(elapsed / CYCLE_MS);
    if (index !== cycle) {
      cycle = index;
      impactAt = null;
      renderer.reset();
      bout = new ShowcaseBout(CAST, (event) => {
        if (event.type === "impact") impactAt = tickAt;
        renderer.react(event, tickAt);
      });
      for (let t = 0; t < PRE_ROLL_MS; t += STEP_MS) bout.step(STEP_MS);
      last = now;
    }
    const frozen = impactAt !== null && tickAt - impactAt > FREEZE_AFTER_IMPACT_MS;
    // The capture tool steps the clock in whole frames; catch up in fixed steps so every run is identical.
    while (last + STEP_MS <= now) {
      last += STEP_MS;
      if (!frozen) bout!.step(STEP_MS);
    }
    renderer.update(bout!.scene(), tickAt, { scores: bout!.scores });
    if (!draw || now - drawnAt < DRAW_EVERY_MS) return;
    drawnAt = now;
    renderer.draw();
  };

  // Browser tests check where the clip is with `?fdebug`.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("fdebug")) {
    window.__fencingClip = () => ({ start, clock: performance.now(), cycle, time: bout?.time ?? 0, impactAt, tickAt, frozen: impactAt !== null && tickAt - impactAt > FREEZE_AFTER_IMPACT_MS, phase: bout?.driver.engine.phase ?? "" });
  }
  return (now) => {
    if (start === null) {
      // The capture tool counts its warm up from the page saying it is ready, polled every 50 ms,
      // so the clip counts from the same moment. Counting from the first frame would drift by however long the page took to settle.
      if (window.__showcaseReady !== true) return;
      start = Math.ceil(now / READY_POLL_MS) * READY_POLL_MS - seekMs;
      for (let t = start; t < now; t += FAKE_FRAME_MS) tick(t, false);
    }
    tick(now, true);
  };
}

/** A clip start asked for with `?fseek=` in milliseconds, for capturing in pieces. */
export function readSeek(): number {
  if (typeof window === "undefined") return 0;
  return Math.max(0, Number(new URLSearchParams(window.location.search).get("fseek") ?? 0) || 0);
}

declare global {
  interface Window {
    __fencingClip?: () => { start: number | null; clock: number; cycle: number; time: number; impactAt: number | null; tickAt: number; frozen: boolean; phase: string };
  }
}
