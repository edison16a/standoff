import type { Blade } from "./blade";
import type { ArenaEvent, Body, Seat } from "./events";
import { KINDS, type BodyKind } from "./fruit-kinds";
import { sweepHit } from "./geometry";
import { BLADE_REACH, GRAVITY, HALF_HEIGHT, HIT_COOLDOWN_S } from "./tuning";

/** What the spawner asks for: a kind and how it is thrown. */
export interface Launch {
  kind: BodyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: { x: number; y: number; z: number };
}

/** Big fruit gets knocked up by each hit, so a quick player can keep it in the air. */
const KNOCK_UP = 2.4;
const KNOCK_MAX_VY = 5.5;

/**
 * Everything in flight and the blades cutting through it. It knows
 * nothing about scores or rounds, so the lobby's practice fruit and a
 * real round run on the same code.
 */
export class Arena {
  bodies: Body[] = [];
  /** Half the screen's width in world units, set from the window's shape. */
  halfWidth = HALF_HEIGHT * (16 / 9);
  private nextId = 1;

  launch(spec: Launch): Body {
    const info = KINDS[spec.kind];
    const body: Body = {
      id: this.nextId++,
      kind: spec.kind,
      x: spec.x,
      y: spec.y,
      vx: spec.vx,
      vy: spec.vy,
      radius: info.radius,
      hitsLeft: info.hits,
      hits: info.hits,
      cooldown: 0,
      touching: [],
      spin: { ...spec.spin },
    };
    this.bodies.push(body);
    return body;
  }

  clear(): void {
    this.bodies = [];
  }

  /**
   * Moves everything one step and cuts whatever a fast blade swept
   * through. `canCut` says which blades may cut right now: a stunned
   * blade, or a player waiting for the next round, still draws but cuts
   * nothing.
   */
  step(dt: number, blades: ReadonlyMap<Seat, Blade>, canCut: (seat: Seat) => boolean): ArenaEvent[] {
    const events: ArenaEvent[] = [];
    const before = new Map<number, { x: number; y: number }>();
    for (const body of this.bodies) {
      before.set(body.id, { x: body.x, y: body.y });
      body.vy -= GRAVITY * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.cooldown = Math.max(0, body.cooldown - dt);
    }

    for (const [seat, blade] of blades) {
      if (blade.swipeStarted && canCut(seat) && blade.position) {
        events.push({ type: "swipe", seat, at: blade.position, speed: blade.speed });
      }
      if (!blade.cutting || !blade.segment || !canCut(seat)) continue;
      const { from, to } = blade.segment;
      for (const body of this.bodies) {
        if (body.hitsLeft <= 0 || body.cooldown > 0 || body.touching.includes(seat)) continue;
        const start = before.get(body.id) ?? body;
        const t = sweepHit(from, to, start, body, body.radius + BLADE_REACH);
        if (t === null) continue;
        const at = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        events.push(this.cut(seat, body, blade.direction, at));
      }
    }

    this.release(blades);
    const floor = -HALF_HEIGHT - 1.5;
    const side = this.halfWidth + 2.5;
    this.bodies = this.bodies.filter((body) => {
      if (body.hitsLeft <= 0) return false;
      const out = (body.y + body.radius < floor && body.vy < 0) || Math.abs(body.x) - body.radius > side;
      if (out) events.push({ type: "gone", id: body.id });
      return !out;
    });
    return events;
  }

  /** Forgets a blade once it is clear of the fruit it last hit. */
  private release(blades: ReadonlyMap<Seat, Blade>): void {
    for (const body of this.bodies) {
      if (body.touching.length === 0) continue;
      body.touching = body.touching.filter((seat) => {
        const at = blades.get(seat)?.position;
        return at ? Math.hypot(at.x - body.x, at.y - body.y) < body.radius + BLADE_REACH * 2 : false;
      });
    }
  }

  private cut(seat: Seat, body: Body, dir: { x: number; y: number }, at: { x: number; y: number }): ArenaEvent {
    body.hitsLeft -= 1;
    if (body.kind === "bomb") return { type: "bomb", seat, body, at };
    if (body.hits === 1) return { type: "slice", seat, body, dir, at };
    if (body.hitsLeft === 0) return { type: "burst", seat, body, dir, at };
    body.cooldown = HIT_COOLDOWN_S;
    body.touching.push(seat);
    body.vy = Math.min(KNOCK_MAX_VY, Math.max(body.vy, 0) * 0.5 + KNOCK_UP);
    body.vx += dir.x * 0.9;
    return { type: "hit", seat, body, dir, at };
  }
}
