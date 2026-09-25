import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { Vec2 } from "./vec";

export type AthleteAction =
  | "free"
  | "shoot"
  | "pass"
  | "slide"
  | "getup"
  | "stumble"
  | "hurdle"
  | "skill"
  /** Wrong footed by a skill move: a brief stagger before turning to chase. */
  | "beaten"
  | "celebrate"
  | "dejected";

/**
 * The skill moves, picked by the stick against the goal the player
 * attacks: forward a rainbow flick, to either side a crossover (or an
 * elastico for the best dribblers), back a drag back, centred a roulette.
 */
export type SkillKind = "rainbow" | "crossover" | "elastico" | "dragback" | "roulette";

export interface SkillState {
  kind: SkillKind | null;
  /**
   * The side the move takes the ball to, against the player's facing
   * when it started: +1 toward (-sin, cos) of that facing, -1 the other.
   */
  side: 1 | -1;
  /** The facing when the move started, and the way the player leaves it. */
  from: Vec2;
  exit: Vec2;
  /** Running pace when it started, so a move can brake from it. */
  pace: number;
  /** Seconds before another move may start. */
  wait: number;
  /** Builds with every move and cools off, so spamming them gets risky. */
  heat: number;
  /** The defender has been tested, so the move cannot win or lose twice. */
  tested: boolean;
}

/** What a computer player is thinking. Refreshed a few times a second, not every step. */
export interface Brain {
  thinkIn: number;
  target: Vec2;
  /** Seconds before this player may try another slide, pass or skill move. */
  slideWait: number;
  passWait: number;
  skillWait: number;
  /** How long it has dribbled without doing anything else. */
  carried: number;
  /** A player on a phone asked this one for the ball, and how long ago that still counts. */
  caller: number | null;
  callFor: number;
}

export interface AthleteStats {
  goals: number;
  shots: number;
  tackles: number;
  passes: number;
}

export interface Athlete {
  id: number;
  team: TeamId;
  slot: number;
  character: CharacterId;
  /** The phone driving this player, or null for a computer player. */
  seat: number | null;
  /** False while that phone is away. A computer plays for them until it comes back. */
  online: boolean;
  pos: Vec2;
  vel: Vec2;
  /** Radians, 0 facing +x. */
  facing: number;
  action: AthleteAction;
  actionT: number;
  actionLen: number;
  /** The direction of a slide, or of the kick being wound up. */
  actionDir: Vec2;
  /** The run cycle, advanced by distance covered so the feet match the ground. */
  stride: number;
  /** Seconds until this player may touch the ball again. */
  noTouch: number;
  /** Seconds Shoot/Pass has been held down, with or without the ball. */
  charge: number;
  /** Shoot/Pass is down. With the ball and past a tap, the charge bar shows. */
  charging: boolean;
  /** A computer player's planned release, as a charge bar level. */
  release: number | null;
  /** Seconds left on a Shoot press waiting for the ball to arrive. */
  buffered: number;
  /** Who a pass is meant for, while winding up. */
  passTo: number | null;
  /** The pass being wound up goes in the air. */
  lofted: boolean;
  /** Where on the goal line the player pointed a shot, or null to let the game pick. */
  aimZ: number | null;
  /** The stick at a Shoot press made before the ball arrived, for the first time kick. */
  bufferAim: Vec2 | null;
  /** How long that early press was held, which makes it a pass or a shot. */
  bufferHeld: number;
  /** How hard the kick being wound up is, 0 to 1: the charge bar's level for a shot. */
  power: number;
  skill: SkillState;
  /** A slide has already met the ball or the man, so it cannot win twice. */
  slideDone: boolean;
  /** 0 to 1, from the roster. */
  speed: number;
  shooting: number;
  strength: number;
  dribbling: number;
  brain: Brain;
  stats: AthleteStats;
}
