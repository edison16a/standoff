import type { DunkStyle } from "../roster";
import { pressDefend, pressPass, pressShoot, releaseShot, updateAction } from "./actions";
import { createAthlete, moveAthlete, separate } from "./athlete";
import { updateBall } from "./ball";
import { Brains } from "./bot/brains";
import { botTuning, type BotTuning } from "./bot/skill";
import { updateDribbleHand } from "./dribble";
import { facingFor } from "./facing";
import { steerGuard } from "./guard";
import type { MatchEvent } from "./events";
import type { FoulCall, PendingFoul } from "./foul-call";
import { StealLog } from "./fouls";
import { pressFreeThrow, stepFreeThrowBall, updateFreeThrows, type FreeThrows } from "./free-throw";
import { restingBall, type MatchOptions } from "./match-options";
import { tickMoves } from "./moves";
import { seeded, type Rng } from "./rng";
import type { Outcome } from "./shot-model";
import { placeForCheck } from "./check-plan";
import { stepCheckBall, updateCheck, updateDead, type CheckUp } from "./check-up";
import { updateClock, updateCountdown } from "./rules";
import { RULES } from "./tuning";
import type { Athlete, Ball, Button, Phase, TeamId } from "./types";
import type { V2 } from "./vec";

export type { Entry, MatchOptions } from "./match-options";

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
  /** The Computer difficulty, as the knobs the bots read. */
  readonly bots: BotTuning;
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
  /** The break after a basket or a turnover and the check up that ends it, while the ball is dead. */
  checkUp: CheckUp | null = null;
  /** A foul's free throws, from the whistle until the last one leaves the hand. */
  freeThrows: FreeThrows | null = null;
  /** The referee's call, from the whistle until the walk to the line. */
  foulCall: FoulCall | null = null;
  /** A shot fouled in the act, waiting to see whether it drops. */
  pendingFoul: PendingFoul | null = null;
  /** Steal attempts per defender and ball handler this possession, for the foul count. */
  readonly stealLog = new StealLog();
  /** The showcase turns the check up off to keep its highlight short. Real games always check. */
  checkBeat = true;
  /** The next shot's outcome, set by the showcase to film a sure highlight. Real games leave it alone. */
  forced: Outcome | null = null;
  /** The dunk thrown on the next drive, set by the showcase for the same reason. */
  forcedDunk: DunkStyle | null = null;
  gamePoint: [boolean, boolean] = [false, false];
  /** Whose turn it is to bring the ball up, per team, so everyone gets to handle it. */
  readonly checkTurn: [number, number] = [0, 0];
  readonly bumpCd = new Map<string, number>();
  readonly brains: Brains;
  private readonly queue: MatchEvent[] = [];
  /** The last whole second the countdown showed. */
  countShown = 0;

  constructor(options: MatchOptions) {
    this.rng = seeded(options.seed ?? Math.floor(Math.random() * 2 ** 31));
    this.target = options.target ?? RULES.target;
    this.bots = botTuning(options.botLevel ?? "easy");
    const slots: [number, number] = [0, 0];
    this.athletes = options.entries.map((entry, id) => createAthlete(id, entry.team, entry.slot ?? slots[entry.team]++, entry.build, entry.seat));
    this.offence = options.firstOffence ?? (this.rng() < 0.5 ? 0 : 1);
    this.nextOffence = this.offence;
    this.ball = restingBall();
    this.brains = new Brains(this);
    placeForCheck(this, this.offence);
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
    a.stick = { ...a.move };
  }

  /** Guard held or let go. It only steers on defence, but holding it early is fine. */
  setGuard(id: number, on: boolean): void {
    const a = this.athletes[id];
    if (!a) return;
    a.guard = on;
    if (!on) a.guardAim = null;
  }

  press(id: number, button: Button, aim: V2 | null = null): void {
    const a = this.athletes[id];
    if (!a) return;
    if (this.phase === "freeThrow" && button === "shoot") return pressFreeThrow(this, a);
    if (this.phase !== "live") return;
    // On defence Shoot is Guard, held for as long as the thumb stays down.
    if (button === "shoot" && this.defending(a)) return this.setGuard(id, true);
    if (button === "shoot") pressShoot(this, a);
    else if (button === "pass") pressPass(this, a, aim);
    else pressDefend(this, a, aim);
  }

  /** Shoot let go. `heldMs` is the phone's own measure of the hold, free of network lag. */
  release(id: number, heldMs?: number): void {
    const a = this.athletes[id];
    if (!a) return;
    this.setGuard(id, false);
    releaseShot(this, a, heldMs);
  }

  /** The other team has the ball, so this player is on defence. */
  defending(a: Athlete): boolean {
    const holder = this.holder;
    return !!holder && holder.team !== a.team;
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
    if (this.phase === "countdown") updateCountdown(this);
    if (this.phase === "countdown" || this.phase === "over") for (const a of this.athletes) a.move = { x: 0, z: 0 };
    if (this.phase === "live") this.brains.think(dt);
    if (this.phase === "live") for (const a of this.athletes) if (a.guard && !a.auto) steerGuard(this, a, dt);
    if (this.phase === "dead") updateDead(this, dt);
    if (this.phase === "check") updateCheck(this);
    if (this.phase === "freeThrow") updateFreeThrows(this, dt);
    for (const a of this.athletes) {
      a.stealCd = Math.max(0, a.stealCd - dt);
      a.blockCd = Math.max(0, a.blockCd - dt);
      a.grabCd = Math.max(0, a.grabCd - dt);
      a.whiff = Math.max(0, a.whiff - dt);
      tickMoves(a, dt);
      updateAction(this, a, dt);
      moveAthlete(a, dt, this.ball.holder === a.id, facingFor(this, a), this.queue);
      updateDribbleHand(this, a, dt);
    }
    separate(this.athletes, this.queue, this.bumpCd);
    if (!stepCheckBall(this, dt) && !stepFreeThrowBall(this, dt)) updateBall(this, dt);
    if (this.phase === "live") updateClock(this, dt);
  }
}
