import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { other, type FighterId } from "../engine/types";
import type { MirrorInput } from "./anim/anim-input";
import { ShoulderCamera } from "./cameras/shoulder-camera";
import { TvCamera } from "./cameras/tv-camera";
import { FightRenderer, FULL, LEFT, RIGHT, type View } from "./fight-renderer";
import { FightScene } from "./fight-scene";
import type { Look } from "./models/looks";
import { Recorder, replayClock } from "./replay";
import { stance, type RigPose } from "./rig/pose";

/** Where the fight is, as far as the cameras care. */
export type Shot = "menu" | "fight" | "replay" | "celebrate";

export interface DirectorInput {
  match: Match;
  shot: Shot;
  /** Real milliseconds since the shot began. */
  shotMs: number;
  /** Which boxers are played by people, who each get a view. */
  humans: readonly [boolean, boolean];
  mirrors: readonly [MirrorInput | null, MirrorInput | null];
}

/**
 * Decides what is on screen each frame and draws it: each player's view
 * over their boxer's shoulder during the fight, and the broadcast camera
 * for the walk out, the breaks, the knockout replay and the winner. It
 * also records the fight, so a knockout can be replayed in slow motion.
 */
export class Director {
  readonly renderer: FightRenderer;
  readonly scene: FightScene;
  readonly recorder = new Recorder();
  private readonly shoulders: [ShoulderCamera, ShoulderCamera];
  private readonly tv = new TvCamera(34);
  private readonly replayPoses: [RigPose, RigPose] = [stance(), stance()];
  private knockdown: { fighter: FighterId; by: FighterId } | null = null;
  private replayImpactShown = false;
  private last = 0;
  private wasFighting = false;
  private lastShot: Shot = "menu";
  /** Called at the moment the replayed blow lands, for its sound. */
  onReplayImpact: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, looks: readonly [Look, Look], options: { preserve?: boolean } = {}) {
    this.renderer = new FightRenderer(canvas, options);
    this.scene = new FightScene(this.renderer.renderer, looks);
    this.shoulders = [new ShoulderCamera(58), new ShoulderCamera(58)];
  }

  setLooks(looks: readonly [Look, Look]): void {
    this.scene.setLooks(looks);
  }

  /** A new fight: forget the last one's replay and effects. */
  reset(): void {
    this.recorder.reset();
    this.knockdown = null;
    this.scene.fx.clear();
    this.scene.confetti.clear();
    this.scene.referee.reset();
  }

  onEvent(event: MatchEvent, match: Match): void {
    this.scene.onEvent(event);
    if (event.type === "hit") {
      const power = Math.min(1.3, event.damage / 8 + (event.counter ? 0.4 : 0));
      this.shoulders[event.target].shake.kick(0.35 + power);
      this.shoulders[event.fighter].shake.kick(0.12 + power * 0.3);
      this.tv.shake.kick(power * 0.5);
    }
    if (event.type === "block") this.shoulders[event.target].shake.kick(0.2);
    if (event.type === "knockdown") {
      this.recorder.knockdown(match.now);
      this.knockdown = { fighter: event.fighter, by: event.by };
    }
  }

  frame(input: DirectorInput, now: number): void {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    const time = now / 1000;
    const { match } = input;
    const replaying = input.shot === "replay" && this.recorder.ready && this.knockdown;
    // The referee is not recorded, so he steps out of the replay rather than stand frozen in it.
    this.scene.referee.model.root.visible = !replaying;
    if (replaying) this.playReplay(input.shotMs, time, dt);
    else {
      this.replayImpactShown = false;
      this.scene.update(match, { mirrors: input.mirrors, telegraph: [!input.humans[0], !input.humans[1]] }, time, dt);
      if (input.shot === "fight") this.recorder.record(match.now, [this.scene.animators[0].pose, this.scene.animators[1].pose]);
    }
    // Confetti comes down on the winner once the replay is over, not during it.
    if (input.shot === "celebrate" && this.lastShot !== "celebrate" && match.result?.winner != null) {
      const spot = match.footwork.spots[match.result.winner];
      this.scene.confetti.burst(spot.x, spot.z);
      this.scene.arena.burst(30);
    }
    this.lastShot = input.shot;
    this.renderer.render(this.scene, this.views(input, dt, !!replaying));
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  dispose(): void {
    this.scene.dispose();
    this.renderer.dispose();
  }

  private playReplay(shotMs: number, time: number, dt: number): void {
    const { t, slow } = replayClock(shotMs);
    this.recorder.pose(t, this.replayPoses);
    this.scene.animators[0].rig.apply(this.replayPoses[0]);
    this.scene.animators[1].rig.apply(this.replayPoses[1]);
    if (t >= 0 && !this.replayImpactShown && this.knockdown) {
      this.replayImpactShown = true;
      this.scene.impact(this.knockdown.fighter, this.knockdown.by, 2.6, false);
      this.tv.shake.kick(1.2);
      this.onReplayImpact?.();
    }
    this.scene.animate(time, dt * slow);
  }

  private views(input: DirectorInput, dt: number, replaying: boolean): View[] {
    const { match } = input;
    const [a, b] = match.footwork.spots;
    const t = input.shotMs / 1000;
    const tv = this.tv;
    if (replaying && this.knockdown) {
      // Low and close on the boxer taking the blow, circling slowly as it lands.
      const pose = this.replayPoses[this.knockdown.fighter];
      const hitter = this.replayPoses[this.knockdown.by];
      tv.setFov(30);
      tv.sideOn({ x: hitter.x, z: hitter.z }, { x: pose.x, z: pose.z }, -0.5 + t * 0.07, 2.6, 1.35, 1.2, 0.62);
      tv.finish(dt);
      return [{ rect: FULL, camera: tv.camera }];
    }
    if (input.shot === "menu") {
      tv.setFov(34);
      tv.sideOn(a, b, 0.4 + t * 0.05, 4.6, 2.3, 1.1);
      tv.finish(dt);
      return [{ rect: FULL, camera: tv.camera }];
    }
    if (input.shot === "celebrate" || match.phase === "over") {
      const winner = match.result?.winner ?? 0;
      const spot = match.footwork.spots[winner];
      tv.setFov(36);
      tv.orbit(spot, match.footwork.facing(winner) + 0.5 + t * 0.12, 3.9, 2.1, 1.3);
      tv.finish(dt);
      return [{ rect: FULL, camera: tv.camera }];
    }
    if (match.phase === "intro" || match.phase === "break") {
      // The walk out dollies in from wide; the break is a slow sweep over the ring. Both run on the
      // match clock, so a slow machine sees the same shot, only in fewer frames.
      tv.setFov(34);
      const intro = match.phase === "intro";
      const k = Math.min(1, match.now / 3500);
      const swept = (match.now % 20000) / 1000;
      tv.sideOn(a, b, intro ? -0.9 + k * 0.8 : 1 + swept * 0.08, intro ? 6.8 - k * 2.8 : 5.5, intro ? 2.9 - k * 0.9 : 3.2, 1.2);
      tv.finish(dt);
      this.wasFighting = false;
      return [{ rect: FULL, camera: tv.camera }];
    }
    const humans = ([0, 1] as const).filter((id) => input.humans[id]);
    if (humans.length === 0) {
      tv.sideOn(a, b, 0.3, 3.6, 1.8, 1.25);
      tv.finish(dt);
      return [{ rect: FULL, camera: tv.camera }];
    }
    const down = match.fighters.some((f) => f.down) ? 1 : 0;
    const views = humans.map((id): View => {
      const camera = this.shoulders[id];
      camera.camera.fov = humans.length === 1 ? 50 : 62;
      camera.camera.updateProjectionMatrix();
      camera.update(match.footwork.spots[id], match.footwork.spots[other(id)], dt, down);
      return { rect: humans.length === 1 ? FULL : id === 0 ? LEFT : RIGHT, camera: camera.camera };
    });
    if (!this.wasFighting) for (const id of humans) this.shoulders[id].snap();
    this.wasFighting = true;
    return views;
  }
}

