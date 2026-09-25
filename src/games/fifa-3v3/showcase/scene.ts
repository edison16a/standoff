import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import { FixedStepClock } from "../engine/clock";
import type { MatchEvent } from "../engine/events";
import { createMatch, stepMatch, type Entrant } from "../engine/match";
import { PITCH, STEP } from "../engine/tuning";
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
  // The first shots are saved, for some drama in the build up, and then they go in.
  return createMatch(LINEUP, { seed: SEED, replays: false, rig: (n) => (n < 2 ? "parry" : "goal") });
}

/**
 * When the showcase's goal is struck, found by playing the seeded match
 * through once: the first strike from outside the box after some build
 * up, which films better than a tap in from the kick off.
 */
function pickStrike(): number {
  const state = fresh();
  let fallback = 20;
  for (let t = 0; t < 180; t += STEP) {
    stepMatch(state);
    for (const e of state.events) {
      if (e.type !== "shot" || e.outcome !== "goal") continue;
      if (state.time > 9 && e.distance > 7) return state.time;
      if (fallback === 20) fallback = state.time;
    }
  }
  return fallback;
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
    const strike = pickStrike();
    // The loop: the build up fills the first five seconds of the film, then the finish and the party.
    const start = kind === "loop" ? Math.max(0, strike - WARMUP - 5.2) : strike + (kind === "icon" ? 0.03 : 0.3);
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

  /**
   * The goal line camera: low beside the near post, looking out at the
   * shooter, with the keeper at full stretch and the ball on its way.
   */
  private posterPose(): Pose {
    const s = this.state.athletes[this.shooter() ?? 0]!;
    const dir = attackSign(s.team);
    const gx = dir * PITCH.halfLength;
    const ball = this.state.ball.pos;
    const look = new THREE.Vector3(s.pos.x * 0.4 + ball.x * 0.6, 1.0, s.pos.z * 0.4 + ball.z * 0.6);
    const pos = new THREE.Vector3(gx - dir * 1.0, 1.1, PITCH.goalHalfWidth + 4.6);
    return { pos, look, fov: 46 };
  }

  /** Close on the shooter's strike from the lit near side, the ball leaving the boot. */
  private heroPose(): Pose {
    const s = this.state.athletes[this.shooter() ?? 0]!;
    const dir = attackSign(s.team);
    const look = new THREE.Vector3(s.pos.x + dir * 0.4, 0.95, s.pos.z);
    const pos = new THREE.Vector3(s.pos.x + dir * 2.3, 0.5, s.pos.z + 2.1);
    return { pos, look, fov: 40 };
  }
}
