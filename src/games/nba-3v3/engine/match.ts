import type { CharacterId } from "../roster";
import { pressDefend, pressPass, pressShoot, releaseShot, updateAction } from "./actions";
import { createAthlete, moveAthlete, separate } from "./athlete";
import { updateBall } from "./ball";
import { Brains } from "./bot/brains";
import type { MatchEvent } from "./events";
import { seeded, type Rng } from "./rng";
import { placeForCheck, updateClock, updateDead, type CheckPlan } from "./rules";
import { RIM, RULES } from "./tuning";
import type { Athlete, Ball, Button, Phase, TeamId } from "./types";
import type { V2 } from "./vec";

export interface Entry {
  team: TeamId;
  character: CharacterId;
  /** The phone playing this athlete, or null for a computer player. */
  seat: number | null;
}

export interface MatchOptions {
  entries: readonly Entry[];
  seed?: number;
  /** Who has the ball first. Drawn from the seed when left out. */
  firstOffence?: TeamId;
  /** Points to win. */
  target?: number;
}

/**
 * One game of three on three, as pure data and rules. The host feeds it
 * each player's stick and buttons, computer players think for
 * themselves, and it steps at a fixed rate. It never draws or plays a
 * sound: everything worth showing comes out as events.
 */
export class Match {
  readonly athletes: Athlete[];
  readonly ball: Ball;
  readonly rng: Rng;
  readonly target: number;
  phase: Phase = "countdown";
  phaseT = 0;
  time = 0;
  score: [number, number] = [0, 0];
  offence: TeamId;
  nextOffence: TeamId;
  needsClear = false;
  shotClock: number = RULES.shotClock;
  clockWarned = false;
  winner: TeamId | null = null;
  lastPass: { from: number; to: number; at: number } | null = null;
  /** Where everyone lines up for the next check, while the ball is dead. */
  checkPlan: CheckPlan | null = null;
  gamePoint: [boolean, boolean] = [false, false];
  /** Whose turn it is to bring the ball up, per team, so everyone gets to handle it. */
  readonly checkTurn: [number, number] = [0, 0];
  readonly bumpCd = new Map<string, number>();
  readonly brains: Brains;
  private readonly queue: MatchEvent[] = [];
  private lastCount = 0;

  constructor(options: MatchOptions) {
    this.rng = seeded(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.target = options.target ?? RULES.target;
    const slots: [number, number] = [0, 0];
    this.athletes = options.entries.map((entry, id) => createAthlete(id, entry.team, slots[entry.team]++, entry.character, entry.seat));
    this.offence = options.firstOffence ?? (this.rng() < 0.5 ? 0 : 1);
    this.nextOffence = this.offence;
    this.ball = {
      pos: { x: 0, y: 1, z: 9 }, vel: { x: 0, y: 0, z: 0 }, mode: "held", holder: null,
      flight: null, flightT: 0, flightSeg: -1, flightKind: null, passTo: null, passRolled: [],
      shot: null, lastTouch: null, spin: 0, rimCd: 0,
    };
    this.brains = new Brains(this);
    placeForCheck(this, this.offence, true);
  }

  get events(): MatchEvent[] {
    return this.queue;
  }

  emit(event: MatchEvent): void {
    this.queue.push(event);
  }

  drainEvents(): MatchEvent[] {
    return this.queue.splice(0, this.queue.length);
  }

  get holder(): Athlete | null {
    return this.ball.holder === null ? null : (this.athletes[this.ball.holder] ?? null);
  }

  teammates(a: Athlete): Athlete[] {
    return this.athletes.filter((o) => o.team === a.team && o.id !== a.id);
  }

  opponents(team: TeamId): Athlete[] {
    return this.athletes.filter((o) => o.team !== team);
  }

  /** The stick, already turned into court space by the host. */
  setMove(id: number, move: V2): void {
    const a = this.athletes[id];
    if (!a) return;
    const l = Math.hypot(move.x, move.z);
    a.move = l > 1 ? { x: move.x / l, z: move.z / l } : { x: move.x, z: move.z };
  }

  press(id: number, button: Button, aim: V2 | null = null): void {
    const a = this.athletes[id];
    if (!a || this.phase !== "live") return;
    if (button === "shoot") pressShoot(this, a);
    else if (button === "pass") pressPass(this, a, aim);
    else pressDefend(this, a);
  }

  /** Shoot let go. `heldMs` is the phone's own measure of the hold, free of network lag. */
  release(id: number, heldMs?: number): void {
    const a = this.athletes[id];
    if (a) releaseShot(this, a, heldMs);
  }

  /** A human's phone dropped or came back. The computer plays for them meanwhile. */
  setAuto(id: number, auto: boolean): void {
    const a = this.athletes[id];
    if (!a || a.seat === null) return;
    a.auto = auto;
    if (auto) {
      a.move = { x: 0, z: 0 };
      if (a.action.kind === "shoot" && !a.action.released) releaseShot(this, a);
    }
  }

  step(dt: number): void {
    this.time += dt;
    this.phaseT += dt;
    for (const [key, left] of this.bumpCd) this.bumpCd.set(key, left - dt);
    if (this.phase === "countdown") this.countdown();
    if (this.phase === "countdown" || this.phase === "over") for (const a of this.athletes) a.move = { x: 0, z: 0 };
    if (this.phase === "live") this.brains.think(dt);
    if (this.phase === "dead") updateDead(this);
    for (const a of this.athletes) {
      a.stealCd = Math.max(0, a.stealCd - dt);
      a.blockCd = Math.max(0, a.blockCd - dt);
      a.grabCd = Math.max(0, a.grabCd - dt);
      a.whiff = Math.max(0, a.whiff - dt);
      updateAction(this, a, dt);
      moveAthlete(a, dt, this.ball.holder === a.id, this.facing(a), this.queue);
    }
    separate(this.athletes, this.queue, this.bumpCd);
    updateBall(this, dt);
    if (this.phase === "live") updateClock(this, dt);
  }

  private countdown(): void {
    const shown = Math.ceil(RULES.countdown - this.phaseT);
    if (shown > 0 && shown !== this.lastCount) {
      this.lastCount = shown;
      this.emit({ type: "countdown", count: shown });
    }
    if (shown > 0) return;
    this.phase = "live";
    this.phaseT = 0;
    this.emit({ type: "go", team: this.offence });
  }

  /** What a standing player looks at: the rim with the ball, the ball on defence. */
  private facing(a: Athlete): V2 | null {
    if (Math.hypot(a.vx, a.vz) > 1.2 && a.action.kind === "none") return null;
    if (a.action.kind === "shoot" || a.action.kind === "drive") return { x: RIM.x, z: RIM.z };
    if (this.ball.holder === a.id) return { x: RIM.x, z: RIM.z };
    if (a.team !== this.offence || this.ball.mode !== "held") return { x: this.ball.pos.x, z: this.ball.pos.z };
    return null;
  }
}
