import type { Seat } from "@/platform/protocol";
import { Achievements } from "./achievements";
import { Encounter } from "./encounter";
import type { Cutscene, GameEvent, Phase } from "./events";
import { CHOPPER_LINES, ESCAPE_LINES, radioFor } from "./radio";
import { CHECKPOINT_HEAL, CLEAR_SECONDS, CUTSCENE_SECONDS, MAX_HEALTH, RETRY_FLOOR, WALK_SPEED } from "./pacing";
import { checkpointDistance } from "./route";
import { resolveShot, type CastFn } from "./shooting";
import { Squad } from "./squad";
import { CHOPPER_STAGE, STAGE_COUNT, stage as stageSpec } from "./stages";
import type { WeaponId } from "./weapons";

export { MAX_HEALTH } from "./pacing";

const ARMED: ReadonlySet<Phase> = new Set(["travel", "fight", "clear"]);

/**
 * The whole run, from the first street to the ship. Pure game logic with
 * no drawing, sound or network: the host feeds it trigger pulls and time,
 * and it answers with events. The team walks from checkpoint to
 * checkpoint, fights at each, and retries from the last one if it falls.
 */
export class SurvivalGame {
  phase: Phase = "lobby";
  stage = 1;
  phaseTime = 0;
  health = MAX_HEALTH;
  /** How far along the route the team stands, in metres. */
  distance = 0;
  encounter: Encounter | null = null;
  cutscene: Cutscene | null = null;
  readonly squad = new Squad();
  /** Game seconds since the run began. Guns use it for their rate of fire. */
  time = 0;
  private checkpoint = { stage: 1, health: MAX_HEALTH };
  private events: GameEvent[] = [];
  private readonly achievements = new Achievements((event) => this.events.push(event));
  private nextZombieId = 1;
  private shotId = 0;
  private stageHurt = false;
  private lowest = MAX_HEALTH;

  get running(): boolean {
    return this.phase !== "lobby";
  }

  /** Begins a run with these players, at stage 1 unless a test asks for another. */
  start(players: readonly { seat: Seat; weapon: WeaponId }[], firstStage = 1): void {
    for (const p of players) this.squad.enlist(p.seat, p.weapon);
    this.health = MAX_HEALTH;
    this.time = 0;
    this.achievements.reset();
    this.travelTo(Math.max(1, Math.min(STAGE_COUNT, firstStage)));
  }

  /** A player joins mid run, or comes back with a different gun. */
  join(seat: Seat, weapon: WeaponId): void {
    this.squad.enlist(seat, weapon);
  }

  /** A different person took this seat. They set up and join like a late player. */
  release(seat: Seat): void {
    this.squad.release(seat);
  }

  setPresent(seat: Seat, present: boolean): void {
    this.squad.setPresent(seat, present);
  }

  /** A trigger pull. `cast` finds what each bullet hits. Returns true if a shot went off. */
  fire(seat: Seat, cast: CastFn): boolean {
    const member = this.squad.get(seat);
    if (!ARMED.has(this.phase) || !member?.present) return false;
    const result = member.gun.trigger(this.time);
    if (result === "wait") return false;
    if (result === "dry") {
      this.emit({ type: "dry", seat });
      return false;
    }
    this.shotId += 1;
    this.emit({ type: "shot", seat, weapon: member.gun.weapon, shotId: this.shotId });
    const events = resolveShot(member, this.encounter, cast, Math.random, this.phase === "fight");
    for (const event of events) this.emit(event);
    return true;
  }

  reload(seat: Seat): void {
    const member = this.squad.get(seat);
    // Guns only run while the team is on its feet, so a reload asked for when down or after the escape waits for nothing.
    if (this.phase === "lobby" || this.phase === "down" || this.phase === "escaped") return;
    if (member?.present) member.gun.startReload();
  }

  /** From the game over screen: the same fight again, from its checkpoint. */
  retry(): void {
    if (this.phase !== "down") return;
    this.health = Math.max(this.checkpoint.health, RETRY_FLOOR);
    this.squad.refill();
    this.stage = this.checkpoint.stage;
    this.distance = checkpointDistance(this.stage);
    this.beginFight();
  }

  update(dt: number): void {
    // After the escape the clock keeps running for the view of the ship sailing away. Nothing else moves.
    if (this.phase === "escaped") this.phaseTime += dt;
    if (this.phase === "lobby" || this.phase === "down" || this.phase === "escaped") return;
    const before = this.phaseTime;
    this.time += dt;
    this.phaseTime += dt;
    for (const m of this.squad.all()) {
      for (const e of m.gun.update(dt)) this.emit(e.type === "reload-start" ? { ...e, seat: m.seat, weapon: m.gun.weapon } : { ...e, seat: m.seat });
    }
    if (this.phase === "travel") {
      const target = checkpointDistance(this.stage);
      this.distance = Math.min(target, this.distance + WALK_SPEED * dt);
      if (this.distance >= target) this.beginFight();
    } else if (this.phase === "fight") {
      this.updateFight(dt);
    } else if (this.phase === "clear") {
      if (this.phaseTime >= CLEAR_SECONDS) this.afterClear();
    } else if (this.phase === "cutscene" && this.cutscene) {
      this.updateCutscene(this.cutscene, before);
    }
  }

  /** Takes the events since the last call. */
  drain(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  private updateFight(dt: number): void {
    const encounter = this.encounter;
    if (!encounter) return;
    const harm = encounter.update(dt, (event) => this.emit(event));
    if (harm > 0) {
      this.stageHurt = true;
      this.health = Math.max(0, this.health - harm);
      this.lowest = Math.min(this.lowest, this.health);
      if (this.health <= 0) return this.setPhase("down");
    }
    if (!encounter.done) return;
    if (!this.stageHurt) this.achievements.team("untouchable");
    if (this.lowest <= 20) this.achievements.team("closeCall");
    const healed = Math.min(CHECKPOINT_HEAL, MAX_HEALTH - this.health);
    this.health += healed;
    this.emit({ type: "stage-clear", stage: this.stage, healed });
    this.setPhase("clear");
  }

  private afterClear(): void {
    if (this.stage === CHOPPER_STAGE) return this.playCutscene("chopper");
    if (this.stage >= STAGE_COUNT) return this.playCutscene("escape");
    this.travelTo(this.stage + 1);
  }

  private playCutscene(which: Cutscene): void {
    this.cutscene = which;
    this.encounter = null;
    this.setPhase("cutscene");
  }

  private updateCutscene(which: Cutscene, before: number): void {
    const lines = which === "chopper" ? CHOPPER_LINES : ESCAPE_LINES;
    for (const [at, line] of lines) if (before < at && this.phaseTime >= at) this.emit({ type: "radio", line });
    if (this.phaseTime < CUTSCENE_SECONDS[which]) return;
    this.cutscene = null;
    if (which === "chopper") {
      this.achievements.team("changeOfPlans");
      this.travelTo(this.stage + 1);
    } else {
      this.achievements.team("survivor");
      this.setPhase("escaped");
    }
  }

  private travelTo(next: number): void {
    this.stage = next;
    this.encounter = null;
    this.distance = checkpointDistance(next - 1);
    if (next === 13) this.achievements.team("halfway");
    this.setPhase("travel");
    const line = radioFor(next);
    if (line) this.emit({ type: "radio", line });
  }

  private beginFight(): void {
    const spec = stageSpec(this.stage);
    this.checkpoint = { stage: this.stage, health: this.health };
    this.encounter = new Encounter(spec, this.squad.size, spec.index * 7919 + 17, this.nextZombieId);
    this.nextZombieId += 1000;
    this.stageHurt = false;
    this.lowest = this.health;
    this.setPhase("fight");
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
    this.emit({ type: "phase", phase, stage: this.stage });
  }

  private emit(event: GameEvent): void {
    this.events.push(event);
    const stats = (seat: Seat) => this.squad.get(seat)?.stats;
    this.achievements.observe(event, stats, this.squad.size, this.shotId);
  }
}
