import type { CharacterId } from "../roster";
import type { BotBrain, Difficulty } from "./bots/brain";
import type { MatchEvent } from "./events";
import type { Hit, MoveKey } from "./moves";
import type { Rng } from "./rng";
import type { StageDef, StageId } from "./stages";

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * One fighter's controls for one step, from a phone or a bot. The stick
 * is held; the presses are true only on the step the button went down.
 */
export interface Command {
  /** Right and up, each from -1 to 1. */
  x: number;
  y: number;
  jump?: boolean;
  light?: boolean;
  heavy?: boolean;
  ult?: boolean;
}

export type Action =
  | "idle"
  | "run"
  | "jumpsquat"
  | "air"
  | "land"
  | "attack"
  | "hurt"
  | "shield"
  | "dizzy"
  | "dead"
  | "respawn"
  | "out";

export type Button = "light" | "heavy" | "ult";

export interface FighterStats {
  kos: number;
  falls: number;
  damageDealt: number;
  damageTaken: number;
  hits: number;
  ults: number;
}

export interface Fighter {
  id: number;
  /** 0 to 3: the seat colour and start spot. */
  slot: number;
  character: CharacterId;
  /** The phone playing them, or null for a bot. */
  seat: number | null;
  /** Feet position, and velocity from movement. */
  pos: Vec2;
  vel: Vec2;
  /** Launch velocity from the last hit, slowing down on its own. */
  launch: Vec2;
  facing: 1 | -1;
  action: Action;
  /** Frames spent in the current action, from 1. */
  frame: number;
  move: MoveKey | null;
  /** Counts up with every move started, so a hit knows which swing it came from. */
  swing: number;
  /** Who this swing has hit already, as "target:group". */
  struck: string[];
  /** The surface under the fighter, or null in the air. */
  ground: number | null;
  airJumps: number;
  recoveryUsed: boolean;
  /** Frames left ignoring pass through platforms. */
  dropping: number;
  /** Hit stop: frames the fighter is frozen for. */
  freeze: number;
  hitstun: number;
  lag: number;
  invincible: number;
  percent: number;
  stocks: number;
  /** 0 to 1. Full means the ult is ready. */
  ult: number;
  /** 0 to 1. At 0 the shield breaks. */
  shield: number;
  /** Down held on the floor, in frames, for the shield. */
  downHeld: number;
  /** The stick last step, to spot fresh flicks. */
  lastY: number;
  buffer: { button: Button; x: number; y: number; frames: number } | null;
  lastHitBy: { id: number; frame: number } | null;
  /** Where the respawn platform is, while riding it. */
  platform: Vec2 | null;
  /** 1 for the winner, then up, once decided. */
  place: number | null;
  stats: FighterStats;
  brain: BotBrain | null;
}

export interface Projectile {
  id: number;
  owner: number;
  pos: Vec2;
  vel: Vec2;
  r: number;
  life: number;
  hit: Hit;
}

export type Phase = "ready" | "fight" | "game" | "over";

export interface MatchOptions {
  seed: number;
  stage: StageId;
  stocks: number;
  difficulty: Difficulty;
}

export interface MatchState {
  phase: Phase;
  phaseFrame: number;
  /** Steps since the match was made. */
  frame: number;
  stage: StageDef;
  fighters: Fighter[];
  projectiles: Projectile[];
  nextProjectile: number;
  /** Fighters in the order they ran out of lives, with the step it happened on. */
  eliminated: { id: number; frame: number }[];
  winner: number | null;
  rng: Rng;
  /** This step's events, replaced at the start of each step. */
  events: MatchEvent[];
  options: MatchOptions;
}
