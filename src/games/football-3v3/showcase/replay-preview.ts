import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { Match, STEP, buildView } from "../engine";
import { touchdownEnd } from "../engine/score-runout";
import type { MatchEvent } from "../engine/events";
import { ReplayDirector } from "../host/replay/director";
import { ReplayRecorder } from "../host/replay/recorder";
import type { MatchRenderer } from "../render/match-renderer";
import { SHOWCASE_TEAMS } from "./scene";

/** One filmed frame for a frame by frame review: a thirtieth of a second. */
const FRAME = 1 / 30;
/** Gives up looking for the touchdown after this much game time. */
const SEARCH_S = 1800;

/**
 * The touchdown replay as the big screen shows it, for review
 * (development only, ?replay=<seed>, with level=<easy|medium|hard> and
 * td=<n> for the nth touchdown, run for one on the ground). It plays a
 * seeded game of computer players to the touchdown, cuts the replay the
 * host would, and plays it through the real renderer. With speed=step a
 * review script moves it with `window.__fbStep(frames)`.
 */
export class ReplayPreview {
  readonly replay = new ReplayDirector();
  private ms = 0;
  private first = -1;

  constructor(private readonly renderer: MatchRenderer, seed: number, level: BotLevel, nth: number, run: boolean, private readonly stepped: boolean) {
    const match = new Match({ entries: SHOWCASE_TEAMS, seed, level, firstOffense: 0 });
    const recorder = new ReplayRecorder();
    let found = 0;
    let scorer: number | null = null;
    for (let t = 0; t < SEARCH_S && scorer === null; t += STEP) {
      match.step(STEP);
      const events: MatchEvent[] = match.drainEvents();
      recorder.record(buildView(match), events);
      for (const e of events) if (e.type === "touchdown" && !e.conversion && (e.pass === null) === run && ++found === nth) scorer = e.id;
    }
    // On to the end of the celebration, where the host rolls its replay.
    while (scorer !== null && match.phase === "touchdown" && match.phaseT + STEP < touchdownEnd(match)) {
      match.step(STEP);
      recorder.record(buildView(match), match.drainEvents());
    }
    if (scorer !== null) this.replay.start(recorder.all, scorer, [], 0, recorder.cues);
    if (stepped) Object.assign(window, { __fbStep: (n: number) => this.step(n), __fbReplay: this.replay });
  }

  private draw(ms: number, render: boolean): void {
    this.replay.update(ms);
    const frame = this.replay.frame();
    const script = this.replay.script;
    if (!frame || !script) return;
    this.renderer.setReplay({ angle: frame.segment.angle, take: frame.segment.take, passer: script.passer, scorer: script.scorer });
    for (const event of this.replay.sounds()) this.renderer.onEvent(event);
    if (render) this.renderer.draw(frame.view, ms);
    else this.renderer.update(frame.view, ms);
  }

  frame(nowMs: number): void {
    if (this.stepped) {
      if (this.first < 0) this.draw((this.first = 0), true);
      return;
    }
    if (this.first < 0) this.first = nowMs;
    // Loops, so a reviewer can watch it again.
    const length = (this.replay.script?.length ?? 0) * 1000 + 600;
    this.draw((nowMs - this.first) % Math.max(1, length), true);
  }

  private step(frames: number): number {
    for (let i = 0; i < frames; i++) {
      this.ms += FRAME * 1000;
      this.draw(this.ms, i === frames - 1);
    }
    return this.ms / 1000;
  }
}
