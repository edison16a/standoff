import { CHARACTERS, type BladeSpec, type CharacterId } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import { hurtboxes } from "./body";
import type { FighterAction, FighterFrame } from "./frames";
import { distance } from "./geometry";
import { HIT_REACTION_MS, MAX_HEALTH, PUSHBACK_SPEED, STAGGER_MS, START_X, SWING_REARM_SPEED, SWING_SPEED, WALK_SPEED } from "./rules";
import { blendControl, GUARD, swordPose, type SwordControl, type SwordPose } from "./sword";
import { SwordDriver, type KnockTiming } from "./sword-driver";
import type { Combatant } from "./sweep";

/** Flinching after a hit slows the feet to this share of full speed. */
const REELING_WALK = 0.35;

/**
 * One fighter on the host: where they stand on the line, their health,
 * what they are doing, and their sword. The engine moves them one tick at
 * a time and asks for the combatant view of the tick just gone, which is
 * what the swept hit tests read.
 */
export class Fighter {
  readonly facing: 1 | -1;
  readonly sword: SwordDriver;
  characterId: CharacterId;
  x: number;
  /** Where they stood one tick ago, for the swept tests. */
  previousX: number;
  speed = 0;
  /** Footwork from the phone: 1 forward, -1 back, 0 still. */
  move = 0;
  health = MAX_HEALTH;
  action: FighterAction = "idle";
  actionStartedAt = 0;
  /** Their blade may land another hit from then. */
  hitReadyAt = -Infinity;
  /** They cannot be hit again until then. */
  guardUntil = -Infinity;
  /** Metres still to slide back from the last hit taken. */
  recoil = 0;
  private whooshing = false;

  constructor(
    readonly slot: Slot,
    characterId: CharacterId,
    timing: () => KnockTiming,
  ) {
    this.facing = slot === 1 ? 1 : -1;
    this.characterId = characterId;
    this.sword = new SwordDriver(timing);
    this.x = this.startX;
    this.previousX = this.x;
  }

  get startX(): number {
    return -this.facing * START_X;
  }

  get blade(): BladeSpec {
    return CHARACTERS[this.characterId].blade;
  }

  setAction(action: FighterAction, now: number): void {
    this.action = action;
    this.actionStartedAt = now;
  }

  /** Back on their mark with the sword in guard, for a countdown. Health is the match's business. */
  reset(): void {
    this.x = this.startX;
    this.previousX = this.x;
    this.speed = 0;
    this.move = 0;
    this.action = "idle";
    this.hitReadyAt = -Infinity;
    this.guardUntil = -Infinity;
    this.recoil = 0;
    this.whooshing = false;
    this.sword.reset(GUARD);
  }

  /** Ends a flinch or a stagger once it has played out. */
  settle(now: number): void {
    const elapsed = now - this.actionStartedAt;
    if ((this.action === "hit" && elapsed >= HIT_REACTION_MS) || (this.action === "stagger" && elapsed >= STAGGER_MS)) this.setAction("idle", now);
  }

  /** Walks along the line from the footwork buttons, and slides back from a hit. Reeling from a hit slows the feet. */
  walk(dtMs: number, allowed: boolean, now: number): void {
    const reeling = this.action === "hit" && now - this.actionStartedAt < HIT_REACTION_MS;
    this.speed = allowed ? this.move * WALK_SPEED * (reeling ? REELING_WALK : 1) : 0;
    this.x += this.speed * this.facing * (dtMs / 1000);
    const slide = Math.min(this.recoil, PUSHBACK_SPEED * (dtMs / 1000));
    this.x -= this.facing * slide;
    this.recoil -= slide;
  }

  /** Starts a tick: remembers where everything was, then moves the sword on. */
  beginTick(dtMs: number, now: number): void {
    this.previousX = this.x;
    this.sword.step(dtMs, now);
  }

  /** The sword at a fraction of the tick just gone: 0 where it was, 1 where it is now. */
  swordAt(t: number): SwordPose {
    const x = this.previousX + (this.x - this.previousX) * t;
    return swordPose(x, this.facing, blendControl(this.sword.before, this.sword.control, t), this.blade);
  }

  /** How this fighter takes part in the swept tests for the tick just gone. */
  combatant(now: number): Combatant {
    return {
      at: (t) => {
        const pose = this.swordAt(t);
        return { blade: { a: pose.base, b: pose.tip }, body: hurtboxes(this.previousX + (this.x - this.previousX) * t) };
      },
      radius: this.blade.radius,
      canHit: now >= this.hitReadyAt && this.sword.isFree(now) && this.health > 0,
      canBeHit: now >= this.guardUntil && this.health > 0,
    };
  }

  /** The tip's speed over the tick, when it just got fast enough to whoosh. Null otherwise. */
  swing(dtMs: number): number | null {
    const speed = distance(this.swordAt(0).tip, this.swordAt(1).tip) / (dtMs / 1000);
    if (!this.whooshing && speed >= SWING_SPEED) {
      this.whooshing = true;
      return speed;
    }
    if (speed < SWING_REARM_SPEED) this.whooshing = false;
    return null;
  }

  frame(now: number): FighterFrame {
    const control: SwordControl = this.sword.control;
    return {
      slot: this.slot,
      characterId: this.characterId,
      x: this.x,
      facing: this.facing,
      speed: this.speed,
      health: this.health,
      action: this.action,
      actionMs: now - this.actionStartedAt,
      control,
      sword: swordPose(this.x, this.facing, control, this.blade),
      knocked: this.sword.knockedAt(now),
    };
  }
}
