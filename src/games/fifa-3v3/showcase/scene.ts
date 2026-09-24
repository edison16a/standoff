import type * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { FixedStepClock } from "../engine/clock";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import type { MatchState } from "../engine/types";
import { buildView, type MatchView } from "../engine/view";
import type { Shot } from "../render/camera/director";
import type { MatchRenderer } from "../render/match-renderer";

const LINEUP: Entrant[] = [
  { team: 0, character: "ronaldo", seat: null },
  { team: 0, character: "messi", seat: null },
  { team: 0, character: "yamal", seat: null },
  { team: 1, character: "haaland", seat: null },
  { team: 1, character: "mbappe", seat: null },
  { team: 1, character: "vinicius", seat: null },
];

/**
 * The match the showcase films, and which camera films it. Seeded, so
 * every capture is the same match.
 */
export class ShowcaseScene {
  view: MatchView;
  shot: Shot = "tv";
  tags = true;
  private readonly state: MatchState;
  private readonly clock = new FixedStepClock();
  private pinned = false;

  constructor(private readonly kind: ShowcaseView, seek = 0) {
    this.state = createMatch(LINEUP, { seed: 3, replays: false, rig: () => "goal" });
    for (let t = 0; t < seek; t += 1 / 60) stepMatch(this.state);
    this.view = buildView(this.state);
  }

  /** Keeps the camera where the page put it. */
  pin(): void {
    this.pinned = true;
    this.shot = "fixed";
  }

  tick(nowMs: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps; i++) {
      stepMatch(this.state);
      events.push(...this.state.events);
    }
    this.view = buildView(this.state);
    if (!this.pinned) this.shot = this.state.phase === "goal" && this.state.phaseT > 0.9 ? "closeup" : "tv";
    void this.kind;
    return events;
  }

  focus(renderer: MatchRenderer): THREE.Vector3 | undefined {
    return renderer.focusOn(this.view, this.view.scorer);
  }
}
