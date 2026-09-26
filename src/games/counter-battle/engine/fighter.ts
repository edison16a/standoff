import type { CharacterId } from "../roster";
import { Gun } from "./gun-state";
import type { GunId } from "./guns";
import { BODY, RULES } from "./tuning";
import type { V2, V3 } from "./vec";

export type TeamId = 0 | 1;
export type Difficulty = "easy" | "normal" | "hard";

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
}

export interface Fighter {
  id: number;
  team: TeamId;
  /** The phone's seat, or null for a computer player. */
  seat: number | null;
  name: string;
  character: CharacterId;
  difficulty: Difficulty;
  gun: Gun;
  pos: V2;
  /** Floor velocity, for the run cycle and the moving spread. */
  vel: V2;
  /** The way the body and camera face, turned smoothly toward the fight. */
  look: number;
  /** Where the player is aiming, before the kick: world yaw and pitch. */
  aim: { yaw: number; pitch: number };
  pose: Pose;
  /** 0 standing to 1 crouched, eased so the body never snaps. */
  crouch: number;
  health: number;
  alive: boolean;
  brain: Brain;
  /** The shoot button, for a human: held for automatic guns, pulls counted for the others. */
  trigger: { held: boolean; pulls: number; pulledAt: number };
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
  difficulty?: Difficulty;
}

export function createFighter(id: number, setup: FighterSetup): Fighter {
  return {
    id,
    team: setup.team,
    seat: setup.seat,
    name: setup.name,
    character: setup.character,
    difficulty: setup.difficulty ?? "normal",
    gun: new Gun(setup.gun),
    pos: { x: 0, z: 0 },
    vel: { x: 0, z: 0 },
    look: 0,
    aim: { yaw: 0, pitch: 0 },
    pose: "stand",
    crouch: 0,
    health: RULES.health,
    alive: true,
    brain: { stance: "hide", spot: 0, route: [], timer: 0, held: 0, sincePlan: Infinity, peekAt: null, out: 0 },
    trigger: { held: false, pulls: 0, pulledAt: -Infinity },
    hitAt: -Infinity,
    shotAt: -Infinity,
    diedAt: -Infinity,
    kills: 0,
    deaths: 0,
    headshots: 0,
    damage: 0,
  };
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
  f.pose = "stand";
  f.crouch = 0;
  f.health = RULES.health;
  f.alive = true;
  f.brain = { stance: "hide", spot, route: [], timer: 0, held: 0, sincePlan: Infinity, peekAt: null, out: 0 };
  f.trigger = { held: false, pulls: 0, pulledAt: -Infinity };
  f.hitAt = -Infinity;
  f.shotAt = -Infinity;
  f.diedAt = -Infinity;
  f.gun.refill();
}
