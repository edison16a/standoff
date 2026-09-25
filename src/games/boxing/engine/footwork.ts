import type { Random } from "./random";
import { keepInside, mover, noteThrow, ROOM, stepInFight, walkTo, WALK, type Mover } from "./ring-craft";
import { ringStyleFor, type RingStyle } from "./styles";
import { other, type FighterId, type Spot } from "./types";

/** Half the width of the canvas inside the ropes, in metres. */
export const RING_HALF = 2.75;
/** The gap between the boxers' middles when they trade. */
export const FIGHT_RANGE = 1.12;
/** Close enough to touch gloves with arms out. */
export const TOUCH_RANGE = 0.95;
/** Each boxer's own corner, where they rest between rounds and reel back to when stunned. Red is 0. */
export const CORNERS: readonly [Spot, Spot] = [
  { x: -2.2, z: -2.2 },
  { x: 2.2, z: 2.2 },
];

/**
 * "fight" is a round, "neutral" sends the boxer still up to a neutral
 * corner during a count, "corners" takes both to their stools, and
 * "centre" brings them to the middle to touch gloves.
 */
export type FootworkMode = "fight" | "neutral" | "corners" | "centre";

/**
 * Where the boxers stand. In a round each moves in their own style (see
 * `ring-craft.ts`), and a stunned boxer reels back to their corner with
 * the other following to pin them there. Between rounds they walk to
 * their corners and back out to the middle. Players never steer this:
 * they only fight.
 */
export class Footwork {
  readonly spots: [Spot, Spot] = [
    { x: 0, z: -FIGHT_RANGE / 2 },
    { x: 0, z: FIGHT_RANGE / 2 },
  ];
  readonly styles: [RingStyle, RingStyle];
  mode: FootworkMode = "fight";
  /** Who stays where they fell during a count. */
  private downed: FighterId | null = null;
  private readonly movers: [Mover, Mover] = [mover(0), mover(2.1)];
  private trapped: { id: FighterId; until: number } | null = null;

  constructor(
    private readonly random: Random,
    styles: readonly [string | undefined, string | undefined] = [undefined, undefined],
  ) {
    this.styles = [ringStyleFor(styles[0]), ringStyleFor(styles[1])];
  }

  /** Which way a boxer faces, as an angle about the vertical: 0 looks along +z. */
  facing(id: FighterId): number {
    const me = this.spots[id];
    const target = this.mode === "corners" ? { x: 0, z: 0 } : this.spots[other(id)];
    return Math.atan2(target.x - me.x, target.z - me.z);
  }

  distance(): number {
    const [a, b] = this.spots;
    return Math.hypot(b.x - a.x, b.z - a.z);
  }

  /** Standing on their corner's spot, as when sitting down between rounds. */
  inCorner(id: FighterId): boolean {
    const corner = CORNERS[id];
    return Math.hypot(this.spots[id].x - corner.x, this.spots[id].z - corner.z) < 0.08;
  }

  /** The boxer being pinned in their corner after a stun, or null. */
  pinned(now: number): FighterId | null {
    return this.trapped && now < this.trapped.until ? this.trapped.id : null;
  }

  /** A clean hit drives the boxer back a step. */
  knockBack(id: FighterId, strength: number): void {
    this.movers[id].knock = Math.max(this.movers[id].knock, strength);
  }

  /** A stunned boxer reels back to their corner, and the other traps them there until `until`. */
  trap(id: FighterId, until: number): void {
    this.trapped = { id, until };
  }

  threw(id: FighterId, now: number): void {
    noteThrow(this.movers[id], now);
  }

  setMode(mode: FootworkMode, downed: FighterId | null = null): void {
    this.mode = mode;
    this.downed = downed;
    if (mode !== "fight") this.trapped = null;
  }

  /** Puts both boxers in their corners, or face to face in the middle for a fight that starts at once. */
  place(inCorners: boolean): void {
    for (const id of [0, 1] as const) {
      const corner = CORNERS[id];
      const k = inCorners ? 1 : (FIGHT_RANGE / 2 + 0.3) / Math.hypot(corner.x, corner.z);
      this.spots[id].x = corner.x * k;
      this.spots[id].z = corner.z * k;
    }
  }

  update(dtMs: number, now: number): void {
    const dt = Math.min(0.1, dtMs / 1000);
    switch (this.mode) {
      case "corners":
        for (const id of [0, 1] as const) walkTo(this.spots[id], CORNERS[id], dt, WALK * 0.7);
        return;
      case "centre":
        for (const id of [0, 1] as const) walkTo(this.spots[id], this.touchSpot(id), dt, WALK * 0.7);
        return;
      case "neutral":
        if (this.downed !== null) walkTo(this.spots[other(this.downed)], this.neutralCorner(other(this.downed)), dt, WALK * 0.8);
        return;
      case "fight": {
        const pinned = this.pinned(now);
        if (pinned !== null) this.pin(pinned, dt);
        else for (const id of [0, 1] as const) stepInFight(this.spots[id], this.spots[other(id)], this.styles[id], this.movers[id], dt, now, this.random);
      }
    }
  }

  /** The stunned boxer backs into their corner, and the other stands right on top of them. */
  private pin(id: FighterId, dt: number): void {
    const stunned = this.spots[id];
    const corner = CORNERS[id];
    walkTo(stunned, { x: corner.x * 0.95, z: corner.z * 0.95 }, dt, WALK * 0.55);
    const out = Math.hypot(stunned.x, stunned.z) || 1;
    const press = { x: stunned.x - (stunned.x / out) * (FIGHT_RANGE - 0.1), z: stunned.z - (stunned.z / out) * (FIGHT_RANGE - 0.1) };
    walkTo(this.spots[other(id)], press, dt, WALK);
    keepInside(this.spots[other(id)]);
  }

  /** Where each boxer stands to touch gloves: face to face in the middle, on the line from their corner. */
  private touchSpot(id: FighterId): Spot {
    const corner = CORNERS[id];
    const k = TOUCH_RANGE / 2 / Math.hypot(corner.x, corner.z);
    return { x: corner.x * k, z: corner.z * k };
  }

  /** The neutral corner furthest from the boxer who is down. */
  private neutralCorner(id: FighterId): Spot {
    const down = this.spots[other(id)];
    const corners = [
      { x: -ROOM + 0.05, z: ROOM - 0.05 },
      { x: ROOM - 0.05, z: -ROOM + 0.05 },
    ];
    return corners.reduce((best, c) => (Math.hypot(c.x - down.x, c.z - down.z) > Math.hypot(best.x - down.x, best.z - down.z) ? c : best));
  }
}
