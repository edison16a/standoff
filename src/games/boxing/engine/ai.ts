import type { MatchEvent } from "./events";
import type { Match } from "./match";
import { between, pick, type Random } from "./random";
import { NO_DEFENSE, other, type DefenseInput, type FighterId, type Hand, type PunchStyle } from "./types";

/** How the computer boxer fights in one round. It gets sharper every round. */
export interface AiLevel {
  /** The telegraph before each punch, so a player can see it coming. */
  windup: readonly [number, number];
  /** The pause between attacks. */
  gap: readonly [number, number];
  /** Chances to block, or to duck or slip, a punch coming in. */
  block: number;
  dodge: number;
  /** Chance to fire back after a block or a dodge. */
  counter: number;
  /** Chance a punch is followed straight away by another. */
  combo: number;
  /** The count it gets up at after its first knockdown and its second. */
  getUp: readonly [readonly [number, number], readonly [number, number]];
}

export const AI_LEVELS: readonly AiLevel[] = [
  { windup: [720, 880], gap: [1700, 2800], block: 0.3, dodge: 0.08, counter: 0.3, combo: 0.15, getUp: [[4, 6], [6, 8]] },
  { windup: [600, 720], gap: [1300, 2200], block: 0.4, dodge: 0.14, counter: 0.45, combo: 0.3, getUp: [[3, 5], [5, 8]] },
  { windup: [500, 600], gap: [950, 1700], block: 0.5, dodge: 0.2, counter: 0.6, combo: 0.45, getUp: [[2, 4], [4, 7]] },
];

const PUNCH_CHOICES: readonly (readonly [readonly [Hand, PunchStyle], number])[] = [
  [["left", "jab"], 45],
  [["right", "cross"], 30],
  [["left", "hook"], 12],
  [["right", "hook"], 13],
];

/**
 * The computer boxer. It reads the other boxer's shoulders, so it can
 * block or dodge a punch the moment it leaves, and it winds its own
 * punches up for long enough that a player can react. It covers up when
 * hurt, fires back after defending and follows up when its opponent is
 * staggered. Everything goes through the same match rules as a player.
 */
export class ComputerBoxer {
  private nextAttack: number;
  private defense: { kind: "guard" | "duck" | "slip"; until: number; side: -1 | 1 } | null = null;
  private combo = 0;
  private getUpAt = 10;
  private coverUntil = -Infinity;

  constructor(
    readonly id: FighterId,
    private readonly random: Random,
    private readonly level: (round: number) => AiLevel = (round) => AI_LEVELS[Math.min(AI_LEVELS.length, round) - 1]!,
  ) {
    this.nextAttack = between(random, 900, 1600);
  }

  /** Reacts to what just happened in the fight. */
  hear(event: MatchEvent, match: Match): void {
    const level = this.level(match.round);
    const now = match.now;
    if (event.type === "throw" && event.fighter === other(this.id)) {
      const roll = this.random();
      const until = event.impactAt + 160;
      if (roll < level.dodge) {
        // A hook cannot be slipped, so it gets ducked.
        const kind = event.style === "hook" || this.random() < 0.4 ? "duck" : "slip";
        this.defense = { kind, until, side: this.random() < 0.5 ? -1 : 1 };
      } else if (roll < level.dodge + level.block) {
        this.defense = { kind: "guard", until, side: 1 };
      }
      // Straight away, not on the next frame: on a slow machine a frame can be longer than a jab.
      match.setInput(this.id, this.defend(match));
    }
    if (event.type === "counter" && event.fighter === this.id && this.random() < level.counter) {
      this.nextAttack = Math.min(this.nextAttack, now + 60);
    }
    if (event.type === "hit" && event.target === this.id) {
      this.defense = null;
      const hurt = match.fighters[this.id].health < 35;
      if (hurt && this.random() < 0.5) this.coverUntil = now + between(this.random, 900, 1800);
    }
    if (event.type === "knockdown" && event.fighter === this.id) {
      const [low, high] = level.getUp[Math.min(1, event.knockdowns - 1)]!;
      this.getUpAt = Math.round(between(this.random, low, high));
    }
    if (event.type === "round" || event.type === "resume") this.nextAttack = now + between(this.random, 700, 1400);
  }

  update(match: Match): void {
    const now = match.now;
    const me = match.fighters[this.id];
    const them = match.fighters[other(this.id)];
    const input = this.defend(match);
    match.setInput(this.id, input);
    if (match.phase !== "fight" || now < this.nextAttack || input.guard || !me.canPunch(now)) return;

    const level = this.level(match.round);
    const pressing = them.staggered(now) || them.rocked(now);
    const followUp = this.combo > 0;
    const [hand, style] = pick(this.random, PUNCH_CHOICES);
    const quick = pressing || followUp || me.counterOpen(now);
    const windup = between(this.random, level.windup[0], level.windup[1]) * (quick ? 0.55 : 1);
    if (!match.throwPunch(this.id, hand, style, between(this.random, 0.45, 0.9), windup)) return;
    const punch = me.punch!;
    if (followUp) this.combo--;
    else if (this.random() < level.combo) this.combo = this.random() < 0.3 ? 2 : 1;
    this.nextAttack = this.combo > 0 ? punch.impactAt + 90 : punch.endAt + between(this.random, level.gap[0], level.gap[1]);
  }

  private defend(match: Match): DefenseInput {
    const now = match.now;
    const input: DefenseInput = { ...NO_DEFENSE };
    if (this.defense && now > this.defense.until) this.defense = null;
    if (this.defense?.kind === "guard" || now < this.coverUntil) input.guard = true;
    if (this.defense?.kind === "duck") input.duck = true;
    if (this.defense?.kind === "slip") input.slip = this.defense.side;
    const down = match.fighters[this.id].down;
    if (down) input.raise = down.count >= this.getUpAt;
    return input;
  }
}
