import type { Match } from "../match";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { thinkDefence } from "./defence";
import { thinkOffBall, thinkWithBall } from "./offence";
import { thinkScramble } from "./scramble";
import { freshState, type BotState } from "./util";

/** Every way to pair three defenders with three attackers. */
const PAIRINGS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * The computer players' minds. Each keeps a little memory, and the
 * defence keeps matchups, picked on every change of possession so each
 * defender takes the nearest attacker.
 */
export class Brains {
  private readonly states = new Map<number, BotState>();
  private readonly matchups = new Map<number, number>();

  constructor(private readonly m: Match) {}

  /** Forget plans and pick new matchups, after any change of possession. */
  reset(): void {
    for (const s of this.states.values()) Object.assign(s, freshState());
    this.matchups.clear();
    const offence = this.m.athletes.filter((a) => a.team === this.m.offence);
    const defence = this.m.athletes.filter((a) => a.team !== this.m.offence);
    let best: number[] = PAIRINGS[0]!;
    let bestCost = Infinity;
    for (const pairing of PAIRINGS) {
      let cost = 0;
      defence.forEach((d, i) => {
        const o = offence[pairing[i] ?? 0];
        if (o) cost += dist2(d, o);
      });
      if (cost < bestCost) {
        bestCost = cost;
        best = pairing;
      }
    }
    defence.forEach((d, i) => {
      const o = offence[best[i] ?? 0];
      if (o) this.matchups.set(d.id, o.id);
    });
  }

  /** Who a defender is guarding. */
  manFor(id: number): Athlete | null {
    const target = this.matchups.get(id);
    return target === undefined ? null : (this.m.athletes[target] ?? null);
  }

  /** Where a computer player is heading, if anywhere. */
  heading(id: number): V2 | null {
    return this.states.get(id)?.target ?? null;
  }

  think(dt: number): void {
    const m = this.m;
    const b = m.ball;
    for (const a of m.athletes) {
      if (!a.auto) continue;
      const s = this.state(a.id);
      if (b.mode === "loose" || (b.mode === "flight" && b.flightKind !== "pass")) {
        s.holdFor = 0;
        thinkScramble(m, a);
      } else if (b.holder === a.id) {
        thinkWithBall(m, a, s, dt);
      } else if (a.team === m.offence) {
        s.holdFor = 0;
        thinkOffBall(m, a, s, (id) => this.heading(id));
      } else {
        thinkDefence(m, a, s, this.manFor(a.id), dt);
      }
    }
  }

  private state(id: number): BotState {
    let s = this.states.get(id);
    if (!s) {
      s = freshState();
      this.states.set(id, s);
    }
    return s;
  }
}
