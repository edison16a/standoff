import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { CharacterId } from "../roster";
import { Gun } from "./gun-state";
import type { GunId } from "./guns";
import { BODY, RULES } from "./tuning";
import type { V2, V3 } from "./vec";

export type TeamId = 0 | 1;

/**
 * What the body is doing, which decides the hit boxes and the animation.
 * Only "crouch" lowers the body; "peek" is standing clear of cover.
 */
export type Pose = "run" | "crouch" | "peek" | "stand";

/** Where the movement brain is: running a route, hiding at a spot, or out looking. */
export type Stance = "move" | "hide" | "peek";

export interface Brain {
  stance: Stance;
  /** The spot being run to or held. */
  spot: number;
  /** Spots still to run through, next first. */
  route: number[];
  /** Seconds left in the current hide or peek. */
  timer: number;
  /** Seconds spent at the current spot, which makes a fighter restless. */
  held: number;
  /** Seconds since the last plan. */
  sincePlan: number;
  /** Where the fighter steps to peek, or null to stand up in place. */
  peekAt: V2 | null;
  /** Seconds out in the current peek, which caps how long shooting can hold it open. */
  out: number;
  /** Seconds a player has held Crouch, which stops them hiding for ever. */
  down: number;
  /** The spot last stood at or passed, which RETREAT heads back to from partway along a run. */
  last: number;
  /** Which way a player's current run goes: 1 advancing, -1 retreating. */
  heading: 1 | -1;
  /** Where a player stopped partway along a run, or null when they hold at a spot. */
  anchor: V2 | null;
}

/** A player's ADVANCE (1) or RETREAT (-1) button, or 0 with neither held. */
export type MoveInput = -1 | 0 | 1;

export interface Fighter {
  id: number;
  team: TeamId;
  /** The phone's seat, or null for a computer player. */
  seat: number | null;
  name: string;
  character: CharacterId;
  /** How well the computer plays this fighter: always for a bot, and for a player whose phone dropped. */
  difficulty: BotLevel;
  gun: Gun;
  pos: V2;
  /** Floor velocity, for the run cycle and the moving spread. */
  vel: V2;
  /** The way the body and camera face, turned smoothly toward the fight. */
  look: number;
  /** Where the player is aiming, before the kick: world yaw and pitch. */
  aim: { yaw: number; pitch: number };
  /** The point a player's phone picked in the world, or null when aimed by angles (a bot). */
  aimPoint: V3 | null;
  pose: Pose;
  /** 0 standing to 1 crouched, eased so the body never snaps. */
  crouch: number;
  health: number;
  alive: boolean;
  brain: Brain;
  /** The shoot button, for a human: held for automatic guns, pulls counted for the others. */
  trigger: { held: boolean; pulls: number; pulledAt: number };
  /** A player holding Crouch: stay down behind cover, or move crouched. */
  duck: boolean;
  /** A player holding ADVANCE or RETREAT. */
  move: MoveInput;
  /** A wish to come up out of cover now, from a shot or letting go of Crouch. The brain takes it on its next step. */
  rise: boolean;
  /** Game time of the last hit taken, fired shot and death, for animation. */
  hitAt: number;
  shotAt: number;
  diedAt: number;
  kills: number;
  deaths: number;
  headshots: number;
  damage: number;
}

export interface FighterSetup {
  team: TeamId;
  seat: number | null;
  name: string;
  character: CharacterId;
  gun: GunId;
  difficulty?: BotLevel;
}

export function createFighter(id: number, setup: FighterSetup): Fighter {
  return {
    id,
    team: setup.team,
    seat: setup.seat,
    name: setup.name,
    character: setup.character,
    difficulty: setup.difficulty ?? DEFAULT_BOT_LEVEL,
    gun: new Gun(setup.gun),
    pos: { x: 0, z: 0 },
    vel: { x: 0, z: 0 },
    look: 0,
    aim: { yaw: 0, pitch: 0 },
    aimPoint: null,
    pose: "stand",
    crouch: 0,
    health: RULES.health,
    alive: true,
    brain: freshBrain(0),
    trigger: { held: false, pulls: 0, pulledAt: -Infinity },
    duck: false,
    move: 0,
    rise: false,
    hitAt: -Infinity,
    shotAt: -Infinity,
    diedAt: -Infinity,
    kills: 0,
    deaths: 0,
    headshots: 0,
    damage: 0,
  };
}

function freshBrain(spot: number): Brain {
  return { stance: "hide", spot, route: [], timer: 0, held: 0, sincePlan: Infinity, peekAt: null, out: 0, down: 0, last: spot, heading: 1, anchor: null };
}

export const isBot = (f: Fighter): boolean => f.seat === null;

/** Whether the body is low enough to count as crouched for hit boxes and sight. */
export const crouched = (f: Fighter): boolean => f.crouch > 0.5;

const mix = (stand: number, low: number, t: number) => stand + (low - stand) * t;

/** The fighter's hit shapes: a body cylinder and a head sphere. */
export function hitShape(f: Fighter): { top: number; head: V3 } {
  const top = mix(BODY.standTop, BODY.crouchTop, f.crouch);
  return { top, head: { x: f.pos.x, y: mix(BODY.standHead, BODY.crouchHead, f.crouch), z: f.pos.z } };
}

/** Where shots leave from and where the fighter sees from. */
export function eyeOf(f: Fighter): V3 {
  return { x: f.pos.x, y: mix(BODY.standEye, BODY.crouchEye, f.crouch), z: f.pos.z };
}

/**
 * The eye a player's aim and crosshair are worked out from: always at
 * standing height, so ducking never moves what the crosshair is on. A
 * crouched player cannot shoot until they are up anyway.
 */
export function aimEye(f: Fighter): V3 {
  return { x: f.pos.x, y: BODY.standEye, z: f.pos.z };
}

/** Points a shooter looks for: chest and head. */
export function targetPoints(f: Fighter): { chest: V3; head: V3 } {
  const { top, head } = hitShape(f);
  return { chest: { x: f.pos.x, y: top * 0.72, z: f.pos.z }, head };
}

/** Back to a fresh start for a round at `pos`, facing `look`. */
export function resetFighter(f: Fighter, pos: V2, look: number, spot: number): void {
  f.pos = { ...pos };
  f.vel = { x: 0, z: 0 };
  f.look = look;
  f.aim = { yaw: look, pitch: 0 };
  f.aimPoint = null;
  f.pose = "stand";
  f.crouch = 0;
  f.health = RULES.health;
  f.alive = true;
  f.brain = freshBrain(spot);
  f.trigger = { held: false, pulls: 0, pulledAt: -Infinity };
  f.duck = false;
  f.move = 0;
  f.rise = false;
  f.hitAt = -Infinity;
  f.shotAt = -Infinity;
  f.diedAt = -Infinity;
  f.gun.refill();
}
