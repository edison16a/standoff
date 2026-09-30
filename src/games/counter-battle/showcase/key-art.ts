import * as THREE from "three";
import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import type { Fighter, FighterSetup, Stance } from "../engine/fighter";
import type { GunId } from "../engine/guns";
import { coneOf, resolveShot } from "../engine/shooting";
import { STEP } from "../engine/tuning";
import type { V2, V3 } from "../engine/vec";
import type { CharacterId } from "../roster";

/** One actor in the key art: who, where, how low, and what they shoot at when. */
export interface Role {
  team: 0 | 1;
  character: CharacterId;
  gun: GunId;
  pos: V2;
  /** Which way the body faces, 0 toward +z. */
  look: number;
  crouch: number;
  stance: Stance;
  /** Where the barrel points: the target while firing, the pose otherwise. */
  aim: V3;
  /** Seconds into the stage between which the trigger is held, or null to hold fire. */
  fire: [number, number] | null;
  /** A run across the frame, metres a second, for someone caught mid sprint. */
  run?: V2;
  /** Seconds in when this fighter is taken out by `by`, in a burst of their paint. */
  down?: { at: number; by: number };
}

/**
 * The cover shot. Our hero kneels with his back to the plywood wall in
 * his own base, marker up and ready to swing out, facing the lens. His
 * teammate fires downfield past the wall's end, a third sprints between
 * bunkers, and the cyan side shoots back from the far bunkers, so the
 * frame is full of paint in the air under a bright sky, and one of
 * theirs goes down in a burst of pink.
 */
export const KEY_ART_ROLES: readonly Role[] = [
  { team: 0, character: "pro", gun: "rifle", pos: { x: -1.75, z: -23.1 }, look: -2.58, crouch: 0.55, stance: "move", aim: { x: -5, y: 1.6, z: -25.3 }, fire: null },
  { team: 0, character: "heavy", gun: "smg", pos: { x: -2.6, z: -20.2 }, look: 0.1, crouch: 0.2, stance: "peek", aim: { x: -0.2, y: 1.3, z: -13.6 }, fire: [0.8, 3] },
  { team: 0, character: "runner", gun: "shotgun", pos: { x: -5.36, z: -18.76 }, look: 1.29, crouch: 0, stance: "move", aim: { x: 3, y: 1.2, z: -14 }, fire: null, run: { x: 2.8, z: 0.8 } },
  { team: 1, character: "operator", gun: "rifle", pos: { x: 2.6, z: -11.8 }, look: Math.PI - 0.3, crouch: 0, stance: "peek", aim: { x: -2.6, y: 1.2, z: -20.2 }, fire: [0.5, 3] },
  { team: 1, character: "runner", gun: "smg", pos: { x: -4, z: -7.6 }, look: Math.PI + 0.2, crouch: 0, stance: "peek", aim: { x: -1.62, y: 1.7, z: -22.4 }, fire: [0.3, 3] },
  { team: 1, character: "heavy", gun: "smg", pos: { x: 5.3, z: -14.7 }, look: -1.6, crouch: 0, stance: "move", aim: { x: -2.6, y: 1.2, z: -20.2 }, fire: [1.2, 1.95], run: { x: -2.5, z: 0.5 }, down: { at: 1.95, by: 1 } },
];

/** The camera: low on the grass in front of the hero, looking up past him and down the field. */
export const KEY_ART_CAMERA = { from: new THREE.Vector3(-3.08, 0.75, -25.22), at: new THREE.Vector3(-1.67, 0.98, -22.58), fov: 46 };

/** Seconds of the stage the still is held at, with paint in the air. */
export const KEY_ART_AT = 2.2;

/**
 * Plays the key art: fighters placed by hand and held in their poses
 * while the shooters fire at their marks, so the frame is the same every
 * time. It runs the real shots, paint and hits, like the lab does.
 */
export class KeyArt {
  readonly battle: Battle;
  private t = 0;

  constructor(private readonly roles: readonly Role[] = KEY_ART_ROLES) {
    const setups: FighterSetup[] = roles.map((r, i) => ({ team: r.team, seat: i + 1, name: r.character, character: r.character, gun: r.gun }));
    this.battle = new Battle(setups, 3);
    this.battle.match.phase = "fight";
    this.battle.fighters.forEach((f, i) => this.place(f, roles[i]!));
  }

  private place(f: Fighter, r: Role): void {
    f.pos = { ...r.pos };
    f.look = r.look;
    f.crouch = r.crouch;
    f.pose = r.crouch > 0.5 ? "crouch" : r.stance === "peek" ? "peek" : "stand";
    f.brain.stance = r.stance;
    f.vel = r.run ? { ...r.run } : { x: 0, z: 0 };
    // Hits flinch and splat but never take a fighter out: only the scripted `down` falls.
    f.health = 1e6;
  }

  /** Moves the stage on one fixed step and returns what happened, like Battle.step. */
  step(): BattleEvent[] {
    const b = this.battle;
    const events: BattleEvent[] = [];
    this.t += STEP;
    b.time += STEP;
    b.fighters.forEach((f, i) => {
      const r = this.roles[i]!;
      f.pos = { x: f.pos.x + f.vel.x * STEP, z: f.pos.z + f.vel.z * STEP };
      b.aimAt(f.id, r.aim);
      if (r.down && f.alive && this.t >= r.down.at) {
        f.alive = false;
        f.diedAt = b.time;
        events.push({ type: "kill", killer: r.down.by, victim: f.id, gun: b.fighters[r.down.by]!.gun.id, head: false });
      }
      for (const e of f.gun.update(STEP)) if (e.type === "reload-start") f.gun.refill();
      const firing = r.fire !== null && this.t >= r.fire[0] && this.t < r.fire[1];
      if (!firing || !f.alive || !f.gun.ready(b.time)) return;
      const aim = { yaw: f.aim.yaw + f.gun.kick.yaw, pitch: f.aim.pitch + f.gun.kick.pitch };
      const cone = coneOf(f);
      if (f.gun.trigger(b.time, b.rng) === "fired") events.push(...resolveShot(f, aim, cone, { pieces: b.pieces, fighters: b.fighters, rng: b.rng, now: b.time }));
    });
    return events;
  }
}
