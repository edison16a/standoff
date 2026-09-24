import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { FixedStepClock } from "../engine/clock";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import { STEP } from "../engine/tuning";
import type { MatchState } from "../engine/types";
import { buildView, type MatchView } from "../engine/view";
import type { Shot } from "../render/camera/director";
import type { MatchRenderer } from "../render/match-renderer";
import { attackSign } from "../teams";

const LINEUP: Entrant[] = [
  { team: 0, character: "ronaldo", seat: null },
  { team: 0, character: "messi", seat: null },
  { team: 0, character: "yamal", seat: null },
  { team: 1, character: "haaland", seat: null },
  { team: 1, character: "mbappe", seat: null },
  { team: 1, character: "vinicius", seat: null },
];
const SEED = 3;
/** The capture tool warms up for three seconds before it films. */
const WARMUP = 3;

function fresh(): MatchState {
  // Every shot goes in, so the highlight always ends in a goal.
  return createMatch(LINEUP, { seed: SEED, replays: false, rig: () => "goal" });
}

/** When the first goal's shot is struck, found by playing the seeded match through once. */
function firstStrike(): number {
  const state = fresh();
  for (let t = 0; t < 180; t += STEP) {
    stepMatch(state);
    if (state.events.some((e) => e.type === "shot" && e.outcome === "goal")) return state.time;
  }
  return 20;
}

/** A still camera, for the icon and the poster. */
export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

/**
 * The match the showcase films, and which camera films it. Seeded, so
 * every capture is the same match. The loop starts a few seconds before
 * a goal so the clip builds up, strikes and celebrates. The poster and
 * the icon freeze the match as the shot flies and pose a camera on it.
 */
export class ShowcaseScene {
  view: MatchView;
  shot: Shot = "tv";
  tags = true;
  pose: Pose | null = null;
  private readonly state: MatchState;
  private readonly clock = new FixedStepClock();
  private pinned = false;
  private frozen = false;

  constructor(private readonly kind: ShowcaseView, seek = 0) {
    this.state = fresh();
    const strike = firstStrike();
    // The loop: the build up fills the first five seconds of the film, then the finish and the party.
    const start = kind === "loop" ? Math.max(0, strike - WARMUP - 5.2) : strike + (kind === "icon" ? 0.1 : 0.3);
    while (this.state.time < start + seek) stepMatch(this.state);
    this.view = buildView(this.state);
    if (kind !== "loop") {
      this.frozen = true;
      this.tags = false;
      this.shot = "fixed";
      this.pose = kind === "icon" ? this.heroPose() : this.posterPose();
    }
  }

  /** Keeps the camera where the page put it. */
  pin(): void {
    this.pinned = true;
    this.shot = "fixed";
    this.pose = null;
  }

  tick(nowMs: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    const steps = this.clock.stepsFor(nowMs);
    for (let i = 0; i < steps && !this.frozen; i++) {
      stepMatch(this.state);
      events.push(...this.state.events);
    }
    this.view = buildView(this.state);
    if (!this.pinned && !this.frozen) {
      const celebrating = this.state.phase === "goal" && this.state.phaseT > 0.8;
      this.shot = celebrating ? "closeup" : "tv";
      this.tags = !celebrating;
    }
    return events;
  }

  focus(renderer: MatchRenderer): THREE.Vector3 | undefined {
    return renderer.focusOn(this.view, this.view.scorer ?? this.shooter());
  }

  private shooter(): number | null {
    return this.state.flight?.shooter ?? null;
  }

  /** Low behind the goal, looking out at the shooter as the ball flies at the net. */
  private posterPose(): Pose {
    const s = this.state.athletes[this.shooter() ?? 0]!;
    const dir = attackSign(s.team);
    const ball = this.state.ball.pos;
    const look = new THREE.Vector3((s.pos.x + ball.x) / 2, 1.1, (s.pos.z + ball.z) / 2);
    const pos = new THREE.Vector3(ball.x + dir * 6.5, 1.6, ball.z * 0.4 + (s.pos.z > 0 ? -3.2 : 3.2));
    return { pos, look, fov: 38 };
  }

  /** Close on the shooter's strike, the ball leaving the boot. */
  private heroPose(): Pose {
    const s = this.state.athletes[this.shooter() ?? 0]!;
    const dir = attackSign(s.team);
    const side = s.pos.z > 0 ? -1 : 1;
    const look = new THREE.Vector3(s.pos.x + dir * 0.5, 0.95, s.pos.z);
    const pos = new THREE.Vector3(s.pos.x + dir * 3.6, 0.7, s.pos.z + side * 2.6);
    return { pos, look, fov: 34 };
  }
}
