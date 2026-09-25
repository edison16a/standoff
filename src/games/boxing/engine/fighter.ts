import { Fatigue } from "./fatigue";
import { RULES } from "./rules";
import { copyDefense, NO_DEFENSE, type DefenseInput, type FighterId, type Hand, type HeadSpot, type Level, type PunchStyle } from "./types";

/** A punch on its way, from the first twitch of the wind up to the glove coming home. */
export interface ActivePunch {
  hand: Hand;
  style: PunchStyle;
  level: Level;
  /** How hard the player threw it, 0 to 1. */
  power: number;
  start: number;
  /** When the wind up ends and the glove leaves. The aim is set from then on. */
  launchAt: number;
  impactAt: number;
  endAt: number;
  /** Where on the other boxer's head it is going, in the same terms as their head spot. */
  aim: HeadSpot;
  /** Thrown inside a counter window. */
  counter: boolean;
  /** Thrown without the stamina for it. */
  tired: boolean;
  resolved: boolean;
}

export interface DownState {
  since: number;
  /** The referee's count so far, 0 while still falling. */
  count: number;
  nextCountAt: number;
  /** When both gloves went up, while they stay up. */
  raisedSince: number | null;
  /**
   * The gloves have been down since the fall. Getting up takes a fresh
   * raise, so a guard still held from before the knockdown does not count.
   */
  lowered: boolean;
  /** When getting up began, or null while still down. */
  risingAt: number | null;
  /** This was the third knockdown, and there is no getting up. */
  final: boolean;
}

export interface FighterStats {
  thrown: number;
  landed: number;
  blocked: number;
  dodged: number;
  counters: number;
  damage: number;
  knockdowns: number;
}

/**
 * One boxer's state in the fight. The match changes it. Everything else
 * reads it: the overlay, the picture and the computer's brain.
 */
export class Fighter {
  health: number = RULES.maxHealth;
  stamina: number = RULES.maxStamina;
  input: DefenseInput = copyDefense(NO_DEFENSE);
  punch: ActivePunch | null = null;
  readonly fatigue = new Fatigue();
  /** A stagger is a stun: the boxer reels back toward their corner. */
  staggerUntil = -Infinity;
  /** No new stun until then, so a boxer is never stunned over and over. */
  stunImmuneUntil = -Infinity;
  rockedUntil = -Infinity;
  counterUntil = -Infinity;
  counterFrom: "block" | "dodge" | null = null;
  down: DownState | null = null;
  knockdowns = 0;
  stats: FighterStats = { thrown: 0, landed: 0, blocked: 0, dodged: 0, counters: 0, damage: 0, knockdowns: 0 };
  /** Damage dealt in each round, which is how rounds are scored. */
  roundDamage: number[] = [];
  /** Knockdowns suffered in each round. */
  roundKnockdowns: number[] = [];
  /** Whether the last hit taken came in from this boxer's left or right, for the head snapping away. */
  lastHit: { at: number; hand: Hand; style: PunchStyle; level: Level; damage: number } | null = null;

  constructor(readonly id: FighterId) {}

  setInput(input: DefenseInput): void {
    this.input = copyDefense(input);
  }

  /** In the middle of a punch, from its wind up until the glove is back. */
  punching(now: number): boolean {
    return !!this.punch && now < this.punch.endAt;
  }

  staggered(now: number): boolean {
    return now < this.staggerUntil;
  }

  rocked(now: number): boolean {
    return now < this.rockedUntil;
  }

  /** Covered up and able to use it: not down, not stunned, not in the middle of a punch. */
  guarding(now: number): boolean {
    return this.input.guard && !this.down && !this.staggered(now) && !this.punching(now);
  }

  counterOpen(now: number): boolean {
    return now < this.counterUntil;
  }

  /** Free to throw: standing, steady, and any earlier punch has landed. */
  canPunch(now: number): boolean {
    if (this.down || this.staggered(now)) return false;
    if (this.punch && !this.punch.resolved) return false;
    return !this.punch || now >= this.punch.impactAt + RULES.chainMs;
  }

  addRoundDamage(round: number, damage: number): void {
    this.roundDamage[round - 1] = (this.roundDamage[round - 1] ?? 0) + damage;
  }

  addRoundKnockdown(round: number): void {
    this.roundKnockdowns[round - 1] = (this.roundKnockdowns[round - 1] ?? 0) + 1;
  }

  /** Stamina comes back while the gloves are home, and fatigue drains away. */
  recover(now: number, dtMs: number): void {
    this.fatigue.update(dtMs, this.health);
    if (this.punching(now) || this.down) return;
    this.stamina = Math.min(RULES.maxStamina, this.stamina + (RULES.staminaRegen * dtMs) / 1000);
  }

  /** Clears the moment to moment state as a round ends, keeping health, stats and knockdowns. */
  breakReset(): void {
    this.punch = null;
    this.staggerUntil = this.rockedUntil = this.counterUntil = this.stunImmuneUntil = -Infinity;
    this.counterFrom = null;
    this.stamina = RULES.maxStamina;
    this.fatigue.reset();
  }

  /** Health back while resting on the stool, never over the top. */
  heal(amount: number): void {
    this.health = Math.min(RULES.maxHealth, this.health + amount);
  }
}
