import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { CHARACTERS, TEAMS } from "../roster";

export interface Line {
  text: string;
  /** 3 the winner, 2 a basket, 1 a block or a steal, 0 small talk. A line never cuts off a bigger one. */
  priority: number;
}

type Score = Extract<MatchEvent, { type: "score" }>;

/**
 * What the arena announcer says. Every basket gets a call, by name, and
 * the call fits the play: a dunk, a three, a layup, the way it went in,
 * an assist, a player heating up, a team on a run, a tie or a new lead,
 * and game point. Each kind of call works through its lines in turn, so
 * the same words do not come round again soon.
 */
export class Commentary {
  private readonly turns = new Map<string, number>();
  private runTeam: 0 | 1 | null = null;
  private run = 0;
  private lastScorer: string | null = null;

  constructor(private readonly nameOf: (id: number) => string) {}

  onEvent(e: MatchEvent, m: Match): Line | null {
    const name = (id: number) => this.nameOf(id);
    switch (e.type) {
      case "go":
        return { text: this.pick("go", ["Let's go!", "Here we go!", "Game on!"]), priority: 1 };
      case "score":
        return { text: this.score(e, m), priority: 2 };
      case "block":
        return { text: this.pick("block", ["Blocked!", `Rejected by ${name(e.id)}!`, "Get that out of here!", `${name(e.id)} says no!`]), priority: 1 };
      case "steal":
        return { text: this.pick("steal", ["Stolen!", `${name(e.id)} with the steal!`, `Picked clean by ${name(e.id)}!`]), priority: 1 };
      case "intercept":
        return { text: this.pick("intercept", ["Picked off!", `${name(e.id)} jumps the pass!`]), priority: 1 };
      case "foul":
        return { text: this.pick("foul", [`Foul on ${name(e.id)}. Two shots.`, `${name(e.id)} reaches in. That's a foul.`, `Whistle! ${name(e.victim)} to the line.`]), priority: 1 };
      case "shake":
        if (!e.hard) return null;
        return { text: this.pick("shake", ["Ankle breaker!", `${name(e.id)} shook him!`, `Oh! ${name(e.id)} broke his ankles!`]), priority: 1 };
      case "fumble":
        return { text: this.pick("fumble", ["Lost the handle!", `${name(e.id)} coughs it up.`]), priority: 0 };
      case "violation":
        return { text: e.reason === "clock" ? "Shot clock violation." : "Out of bounds.", priority: 0 };
      case "win": {
        const team = TEAMS[e.team].name;
        const by = this.lastScorer;
        const lines = [`Ball game! ${team} win it!`, by ? `${by} wins it! Ball game!` : `And that's the game! ${team} win!`];
        return { text: this.pick("win", lines), priority: 3 };
      }
      default:
        return null;
    }
  }

  private score(e: Score, m: Match): string {
    const name = this.nameOf(e.id);
    this.lastScorer = name;
    this.run = this.runTeam === e.team ? this.run + e.points : e.points;
    this.runTeam = e.team;
    // The winning basket is left to the winner's call.
    if (m.score[e.team] >= m.target) return "";
    let text = this.play(e, m, name);
    if (e.assist !== null && this.nth("assist") % 2 === 0) text = `${this.nameOf(e.assist)} finds ${name}. ${text}`;
    const extra = this.extra(e, m, name);
    return extra ? `${text} ${extra}` : text;
  }

  /** The call for the basket itself. */
  private play(e: Score, m: Match, name: string): string {
    if (e.kind === "dunk") {
      // Every dunk is some star's signature, so the name comes from whoever owns it.
      const owner = Object.values(CHARACTERS).find((c) => c.dunk === e.dunk) ?? CHARACTERS[m.athletes[e.id]!.character];
      const style = owner.dunkName.toLowerCase();
      return this.pick("dunk", [`${name} throws it down!`, "Oh, what a dunk!", `${name} with the ${style}!`, `Slam dunk, ${name}!`, `Get up! ${name}!`, "Posterized!"]);
    }
    if (e.points === 3) {
      if (e.outcome === "bank") return this.pick("three-bank", [`${name} banks in the three!`, "Three, off the glass!"]);
      if (e.outcome === "roll" || e.outcome === "bounce") return this.pick("three-lucky", [`It drops! Three for ${name}!`, `${name} gets the roll for three!`]);
      return this.pick("three", [`${name} from downtown!`, "Bang! Nothing but net!", `Splash! ${name} for three!`, `${name}, from way downtown!`, `Three ball! ${name}!`]);
    }
    if (e.kind === "free") return this.pick("free", [`${name} knocks down the free throw.`, "Good from the line.", `${name} at the line. Good.`, "Nothing but net from the stripe."]);
    if (e.kind === "layup") return this.pick("layup", [`${name} lays it in.`, `Easy two for ${name}.`, `${name} to the rack!`, `${name} finishes at the rim.`]);
    const lines: Record<string, string[]> = {
      swish: [`${name} knocks it down.`, `Swish! ${name}.`, `${name}, pull up, got it!`, `Cash, ${name}.`],
      bank: [`${name} off the glass!`, `Bank shot, ${name}.`],
      roll: [`It rolls around and in! ${name}!`, `${name} gets the friendly roll.`],
      bounce: [`Friendly bounce for ${name}!`, `${name} gets the shooter's touch.`],
    };
    return this.pick(`two-${e.outcome}`, lines[e.outcome] ?? [`${name} for two.`, `Good! ${name}.`]);
  }

  /** What else the basket means: a hot hand, a run, the lead, or game point. */
  private extra(e: Score, m: Match, name: string): string | null {
    const team = TEAMS[e.team].name;
    const other = m.score[e.team === 0 ? 1 : 0];
    const mine = m.score[e.team];
    if (mine >= m.target - 2 && mine - e.points < m.target - 2) return "Game point!";
    // Free throws leave the hot hand alone.
    const hot = e.kind !== "free";
    if (hot && e.streak === 4) return `${name} is on fire!`;
    if (hot && e.streak === 3) return `${name} is heating up!`;
    if (mine === other) return `Tie game, ${mine} all.`;
    if (mine > other && mine - e.points < other) return `${team} take the lead!`;
    if (hot && e.streak === 2 && this.nth("again") % 2 === 0) return this.pick("again-line", [`${name} again!`, `Back to back for ${name}!`]);
    if (this.run >= 5 && this.nth("run") % 2 === 0) return `${team} on a ${this.run} to nothing run!`;
    return null;
  }

  /** The next of a set of lines, so each kind cycles through its words. */
  private pick(kind: string, lines: readonly string[]): string {
    return lines[this.nth(kind) % lines.length]!;
  }

  private nth(kind: string): number {
    const n = this.turns.get(kind) ?? 0;
    this.turns.set(kind, n + 1);
    return n;
  }
}
