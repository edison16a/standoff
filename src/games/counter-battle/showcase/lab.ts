import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import type { Fighter, FighterSetup } from "../engine/fighter";
import { GUN_IDS } from "../engine/guns";
import { coneOf, resolveShot } from "../engine/shooting";
import { STEP } from "../engine/tuning";
import { CHARACTER_IDS } from "../roster";

/** One lap of the lab, seconds. */
export const LAB_LENGTH = 24;

/** When each move starts in a lap, for a script taking frames. */
export const LAB_MARKS = { idle: 0, run: 2, kneel: 6, peek: 7.5, fire: 8, reload: 10, hit: 14, death: 16, victory: 19.2 } as const;

const ROW_Z = -28.4;

/**
 * The animation lab: the four characters in a row behind one base, each
 * with a different gun, playing every animation in turn on the same
 * clock: standing, a run forward, sideways and back, kneeling, standing
 * up to aim and fire, the reload, two hits, a fall, and a celebration.
 * It drives the fighters by hand instead of stepping the battle, so each
 * move comes exactly when the marks say.
 */
export class Lab {
  readonly battle: Battle;
  private t = 0;
  private lap = -1;

  constructor() {
    const setups: FighterSetup[] = CHARACTER_IDS.map((character, i) => ({ team: (i < 2 ? 0 : 1) as 0 | 1, seat: i + 1, name: character, character, gun: GUN_IDS[i]! }));
    this.battle = new Battle(setups, 5);
    this.battle.match.phase = "fight";
    this.place();
  }

  private place(): void {
    this.battle.fighters.forEach((f, i) => {
      f.pos = { x: -4.5 + i * 3, z: ROW_Z };
      f.look = 0;
      f.aim = { yaw: 0, pitch: -0.02 };
      f.alive = true;
      f.health = 100;
      f.crouch = 0;
      f.hitAt = -Infinity;
      f.diedAt = -Infinity;
      f.shotAt = -Infinity;
      f.gun.refill();
      f.brain.stance = "move";
    });
  }

  /** Moves the lab on one fixed step and returns what happened, like Battle.step. */
  step(): BattleEvent[] {
    const b = this.battle;
    const events: BattleEvent[] = [];
    this.t += STEP;
    b.time += STEP;
    const lap = Math.floor(this.t / LAB_LENGTH);
    const t = this.t - lap * LAB_LENGTH;
    if (lap !== this.lap) {
      this.lap = lap;
      // A new round to the renderer: splats, celebrations and falls are cleared.
      b.match.round += 1;
      this.place();
    }
    for (const f of b.fighters) {
      for (const e of f.gun.update(STEP)) if (e.type === "reload-start") events.push({ type: "reload-start", fighter: f.id, gun: f.gun.id, seconds: e.seconds });
      this.move(f, t);
      this.act(f, t, events);
    }
    return events;
  }

  private move(f: Fighter, t: number): void {
    const speed = f.gun.spec.speed * 0.45;
    // A square: forward, to the right, back, to the left, facing ahead all the way.
    const legs: [number, number, number, number][] = [[2, 3, 0, 1], [3, 4, -1, 0], [4, 5, 0, -1], [5, 6, 1, 0]];
    f.vel = { x: 0, z: 0 };
    for (const [from, to, dx, dz] of legs) {
      if (t >= from && t < to) {
        const k = Math.min(1, (t - from) / 0.2, (to - t) / 0.2);
        f.vel = { x: dx * speed * k, z: dz * speed * k };
      }
    }
    f.pos = { x: f.pos.x + f.vel.x * STEP, z: f.pos.z + f.vel.z * STEP };
    const kneel = t >= LAB_MARKS.kneel && t < LAB_MARKS.peek;
    f.brain.stance = t >= LAB_MARKS.peek && t < LAB_MARKS.reload ? "peek" : kneel ? "hide" : "move";
    f.pose = kneel ? "crouch" : f.brain.stance === "peek" ? "peek" : "stand";
    const low = kneel ? 1 : 0;
    f.crouch += Math.sign(low - f.crouch) * Math.min(Math.abs(low - f.crouch), 7 * STEP);
  }

  private act(f: Fighter, t: number, events: BattleEvent[]): void {
    const b = this.battle;
    const spec = f.gun.spec;
    const firing = t >= LAB_MARKS.fire && t < LAB_MARKS.fire + (spec.auto ? 1.2 : 1.6);
    if (firing && f.alive && f.gun.ready(b.time)) {
      const aim = { yaw: f.aim.yaw + f.gun.kick.yaw, pitch: f.aim.pitch + f.gun.kick.pitch };
      const cone = coneOf(f);
      if (f.gun.trigger(b.time, b.rng) === "fired") events.push(...resolveShot(f, aim, cone, { pieces: b.pieces, fighters: [f], rng: b.rng, now: b.time }));
    }
    if (near(t, LAB_MARKS.reload)) f.gun.startReload();
    if (near(t, LAB_MARKS.hit) || near(t, LAB_MARKS.hit + 0.9)) {
      f.hitAt = b.time;
      f.health -= 30;
      events.push({ type: "hit", shooter: f.id, target: f.id, damage: 30, head: false, health: f.health });
    }
    if (near(t, LAB_MARKS.death)) {
      f.alive = false;
      f.diedAt = b.time;
      f.health = 0;
      // Every other fighter is pushed forward onto their face; the rest fall back.
      if (f.id % 2) events.push({ type: "kill", killer: f.id, victim: f.id, gun: f.gun.id, head: false });
    }
    if (near(t, LAB_MARKS.victory - 0.2)) {
      f.alive = true;
      f.health = 100;
      f.diedAt = -Infinity;
      f.gun.refill();
    }
    if (f.id === 0 && near(t, LAB_MARKS.victory)) {
      events.push({ type: "round-end", round: b.match.round, winner: 0, score: [1, 0] });
      events.push({ type: "round-end", round: b.match.round, winner: 1, score: [1, 1] });
    }
  }
}

/** True on the one step that crosses `mark`. */
function near(t: number, mark: number): boolean {
  return t >= mark && t < mark + STEP;
}
