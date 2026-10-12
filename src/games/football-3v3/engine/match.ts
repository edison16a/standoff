import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import { attackSign, other, type TeamId } from "../teams";
import { newBall, type Ball, type PassInfo } from "./ball";
import { createAthlete } from "./body";
import { think } from "./bots/brain";
import { setAway, steered } from "./control";
import { pressButton, releaseButton, setAim, setMove } from "./controls";
import { newDrive, type Drive } from "./downs";
import type { MatchEvent, PlayEnd } from "./events";
import type { KickState } from "./kick";
import { lineupProblem, type Entry } from "./lineup";
import { newLinePairs, type LinePair } from "./linemen";
import { chooseCall, startChoose } from "./phases";
import type { Play } from "./play";
import { Rng } from "./rng";
import { stepWorld } from "./world";
import { newSupportState, type SupportState } from "./support/clinch";
import { SUPPORT } from "./support/roster";
import { RULES } from "./tuning";
import type { Athlete, Button, ConversionCall, Phase, PlayCall } from "./types";
import type { V2 } from "./vec";

export interface MatchOptions {
  entries: readonly Entry[];
  seed?: number;
  /** Who has the ball first. Drawn from the seed when left out. */
  firstOffense?: TeamId;
  target?: number;
  quarterSeconds?: number;
  level?: BotLevel;
  /** Support players a side, SUPPORT.perSide unless a test wants the field bare. */
  support?: number;
  /**
   * Whether the last support slot plays the deep threat on offense (on by
   * default). Off, he is the lead back who blocks, as in the game the
   * showcase's media were filmed from.
   */
  deepThreat?: boolean;
}

/**
 * One game of three on three football, as pure data and rules. The host
 * feeds it each phone's sticks and buttons in field space, the computer
 * players think for themselves, and it steps at a fixed rate from a seed,
 * so the same inputs always play out the same. It never draws or plays a
 * sound: everything worth showing comes out as events and views.
 */
export class Match {
  readonly athletes: Athlete[];
  readonly ball: Ball = newBall();
  readonly rng: Rng;
  /** The line's own dice for sheds and pancakes, so rolling them leaves every other draw in a seeded game alone. */
  readonly lineRng: Rng;
  readonly target: number;
  readonly quarterSeconds: number;
  level: BotLevel;
  phase: Phase = "choose";
  phaseT = 0;
  time = 0;
  quarter = 1;
  /** Seconds left in the quarter. Runs only while the ball is live. */
  clock: number;
  /** Tied after four quarters: the next score wins. */
  overtime = false;
  score: [number, number] = [0, 0];
  drive: Drive;
  play: Play | null = null;
  kick: KickState | null = null;
  /** The drive after the whistle, decided when the play ends. */
  nextDrive: Drive | null = null;
  lastEnd: PlayEnd | null = null;
  /** Who scored the last touchdown, for the celebration and the replay. */
  scorer: number | null = null;
  winner: TeamId | null = null;
  /** The trophy presentation once the end of the game cuts to it: who lifts the trophy. */
  ceremony: { captain: number | null } | null = null;
  /** The last pass once it is caught or falls, kept for the replay's numbers. */
  lastPass: PassInfo | null = null;
  readonly lines: LinePair[];
  /** The support players' blocks out in space (support/clinch.ts). */
  readonly support: SupportState;
  /** When each pair of players may next make a pads sound, so one collision is one thud. */
  readonly bumps = new Map<number, number>();
  /** Phones that dropped: the computer plays whoever they steer until they come back. */
  readonly away = new Set<number>();
  private readonly queue: MatchEvent[] = [];

  constructor(options: MatchOptions) {
    const problem = lineupProblem(options.entries);
    if (problem) throw new Error(problem);
    const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
    this.rng = new Rng(seed);
    this.lineRng = new Rng((seed ^ 0x5bd1e995) >>> 0);
    this.target = options.target ?? RULES.target;
    this.quarterSeconds = options.quarterSeconds ?? RULES.quarterSeconds;
    this.clock = this.quarterSeconds;
    this.level = options.level ?? DEFAULT_BOT_LEVEL;
    const athletes: Athlete[] = [];
    for (const team of [0, 1] as const) {
      const side = options.entries.filter((e) => e.team === team);
      const qb = side.find((e) => e.role === "qb")!;
      athletes.push(createAthlete(athletes.length, team, "qb", 0, qb.build, qb.seat));
      side.filter((e) => e.role === "runner").forEach((e, slot) => athletes.push(createAthlete(athletes.length, team, "runner", slot, e.build, e.seat)));
      for (let slot = 0; slot < 3; slot++) athletes.push(createAthlete(athletes.length, team, "lineman", slot, null, null));
      for (let slot = 0; slot < (options.support ?? SUPPORT.perSide); slot++) {
        const a = createAthlete(athletes.length, team, "support", slot, null, null);
        a.deep = slot === SUPPORT.deepSlot && options.deepThreat !== false;
        athletes.push(a);
      }
    }
    this.athletes = athletes;
    this.lines = newLinePairs();
    this.support = newSupportState(seed);
    const first = options.firstOffense ?? (this.rng.chance(0.5) ? 0 : 1);
    this.drive = newDrive(first, RULES.driveStart);
    startChoose(this);
  }

  get events(): readonly MatchEvent[] {
    return this.queue;
  }

  emit(event: MatchEvent): void {
    this.queue.push(event);
  }

  drainEvents(): MatchEvent[] {
    return this.queue.splice(0, this.queue.length);
  }

  get offense(): TeamId {
    return this.drive.offense;
  }

  get defense(): TeamId {
    return other(this.drive.offense);
  }

  athlete(id: number): Athlete | null {
    return this.athletes[id] ?? null;
  }

  /** The player holding the ball, while one is. */
  carrier(): Athlete | null {
    return this.ball.state === "held" && this.ball.holder !== null ? this.athlete(this.ball.holder) : null;
  }

  qbOf(team: TeamId): Athlete {
    return this.athletes.find((a) => a.team === team && a.role === "qb")!;
  }

  /** The athlete a phone owns, if any: its own player, for its name, team and stats. */
  bySeat(seat: number): Athlete | null {
    return this.athletes.find((a) => a.seat === seat) ?? null;
  }

  /** The athlete a phone steers now, which after a pass to a computer teammate is that teammate. */
  steered(seat: number): Athlete | null {
    return steered(this, seat);
  }

  /** Which way along x the team with the ball is going. */
  get sign(): 1 | -1 {
    return attackSign(this.drive.offense);
  }

  /** The move stick, already turned into field space by the host. */
  setMove(id: number, move: V2): void {
    setMove(this, id, move);
  }

  /** The QB's throw stick in field space while held, or null when let go. Letting go throws. */
  setAim(id: number, aim: V2 | null): void {
    setAim(this, id, aim);
  }

  /** A button pressed. `value` is the phone's own meter reading for a kick, free of lag. */
  press(id: number, button: Button, value?: number): void {
    pressButton(this, id, button, value);
  }

  release(id: number, button: Button): void {
    releaseButton(this, id, button);
  }

  /** The QB's pick before a play (kick or throw) or after a touchdown (kick or two). */
  choose(id: number, call: PlayCall | ConversionCall): void {
    chooseCall(this, id, call);
  }

  /** A person's phone dropped or came back, by the athlete it owns. The computer plays for them meanwhile. */
  setAuto(id: number, auto: boolean): void {
    const a = this.athlete(id);
    if (a && a.seat !== null) setAway(this, a.seat, auto);
  }

  step(dt: number): void {
    this.time += dt;
    this.phaseT += dt;
    think(this, dt);
    stepWorld(this, dt);
  }
}
