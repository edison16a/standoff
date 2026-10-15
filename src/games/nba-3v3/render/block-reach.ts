import * as THREE from "three";
import type { BlockHit } from "../engine/blocks/hit";
import { TWO_HANDED, type BlockPreset } from "../engine/blocks/presets";
import { BALL } from "../engine/physics/ball-spec";
import type { Athlete, Ball } from "../engine/types";
import { HAND_PATHS, pathPoint, strikeFrame, type HandPath } from "./block-paths";

/** Within this much of full stretch past the arm's reach, an unplanned jump's hand still goes for the ball. */
const SEEK = 0.7;
/** The hands are drawn into their windup over this long before the strike starts. */
const COCK = 0.16;
/** In the last instant the palm is put on the real ball, so it truly meets it. */
const LOCK = 0.05;
/** Over a shot still in the hands, the contest hand hovers this far back toward him and this far above the ball, cocked for the strike. */
const HOVER = { back: 0.25, up: 0.6 };
/** Half the gap between two palms on the ball. */
const PALMS = 0.11;

const contact = new THREE.Vector3();
const toBall = new THREE.Vector3();
const f = new THREE.Vector3();
const r = new THREE.Vector3();

export interface BlockTouch {
  at: { x: number; y: number; z: number };
  tip: boolean;
  hit?: BlockHit;
  preset?: BlockPreset;
}

interface Follow {
  at: THREE.Vector3;
  dir: THREE.Vector3;
  age: number;
  path: HandPath;
  two: boolean;
}

/**
 * A shot blocker's hands, playing the preset's authored hand path on the
 * engine's plan. The plan says when and where the ball comes to him, so
 * the palm is cocked into the preset's windup, then swung along its
 * curve to arrive on that spot at that moment, warped onto the real ball
 * in the last instant so it truly meets it. After the touch the hand
 * carries on through the way the ball went off, or for a near miss
 * falls away from the spot it never got to.
 */
export class BlockReach {
  /** Where the leading palm should be, the arm doing it, and how much (0 to 1). */
  readonly target = new THREE.Vector3();
  /** The other palm, beside the first, when both hands go up. */
  readonly second = new THREE.Vector3();
  side: "L" | "R" = "R";
  weight = 0;
  two = false;
  private follow: Follow | null = null;
  private planned: object | null = null;
  /** The plan whose strike has been played, so it is never swung twice. */
  private struck: object | null = null;
  /** A plan that came in with the hand already up swings from where the hand is, over the time that is left. */
  private readonly from = new THREE.Vector3();
  private fromHand = false;
  private span = 0;

  /** The engine's block: where the hand met the ball, and which way the ball went off. */
  hit(a: Athlete, t: BlockTouch, ballVel: { x: number; y: number; z: number }): void {
    const preset = t.preset ?? (t.tip ? "tip" : "swat");
    // A touch nobody saw coming (a pass knocked away) uses the hand on the ball's side.
    if (this.weight < 0.3) this.side = sideOf(a, t.at);
    this.struck = a.action.kind === "block" ? (a.action.plan ?? null) : null;
    this.startFollow(t.at, ballVel, HAND_PATHS[preset], TWO_HANDED[preset]);
  }

  update(a: Athlete, ball: Ball | null, shoulder: THREE.Vector3, reach: number, dt: number): void {
    const act = a.action;
    const plan = act.kind === "block" ? act.plan : undefined;
    let want = 0;
    if (this.follow) want = this.playFollow(dt);
    else if (act.kind === "block" && plan && this.struck !== plan) {
      const path = HAND_PATHS[plan.preset];
      const lead = plan.at - act.t;
      if (this.planned !== plan) {
        this.planned = plan;
        this.side = plan.hand;
        // Decided late (as the shot leaves the hand), with the hand already up: no jump back to the preset's windup.
        this.fromHand = this.weight > 0.2 && lead < path.strike;
        this.span = this.fromHand ? Math.max(0.03, lead) : path.strike;
        this.from.copy(this.target);
      }
      this.two = TWO_HANDED[plan.preset];
      contact.set(plan.point.x, plan.point.y, plan.point.z);
      if (plan.hit && ball && ball.mode === "flight" && lead < LOCK) contact.set(ball.pos.x, ball.pos.y, ball.pos.z);
      // The palm on the near face of the ball, not at its middle.
      toBall.copy(contact).sub(shoulder).normalize();
      contact.addScaledVector(toBall, -BALL.radius);
      const k = 1 - Math.max(0, lead) / this.span;
      pathPoint(path, shoulder, contact, this.sd(a, plan.preset), Math.max(0, k), this.target, this.fromHand ? this.from : null);
      want = lead > path.strike ? 0.6 * smooth(1 - (lead - path.strike) / COCK) : 0.6 + 0.4 * Math.min(1, k);
      // Past the moment with no touch: a near miss, or a touch the engine is a frame late with.
      if (lead < -LOCK || (!plan.hit && lead < 0)) {
        this.struck = plan;
        this.startFollow(contact, ball?.vel ?? { x: 0, y: 0, z: 0 }, plan.hit ? path : HAND_PATHS.miss, this.two, plan.hit ? null : shoulder);
      }
    } else if (ball && act.kind === "block" && a.y > 0.05 && ball.mode === "held") {
      // The shooter still rising: a hand up in his face, over the ball and cocked, so the strike to come starts from a real windup.
      this.side = sideOf(a, ball.pos);
      this.two = false;
      contact.set(ball.pos.x, ball.pos.y, ball.pos.z);
      strikeFrame(shoulder, contact, this.side === "R" ? 1 : -1, f, r);
      this.target.copy(contact).addScaledVector(f, -HOVER.back).addScaledVector(r, 0.1);
      this.target.y += HOVER.up;
      want = 0.8 * smooth((a.y - 0.05) / 0.2);
    } else if (ball && act.kind === "block" && a.y > 0.05 && ball.mode === "flight") {
      // No plan (a pass, a ball nobody shot): the hand only goes for it if it comes close.
      toBall.set(ball.pos.x, ball.pos.y, ball.pos.z).sub(shoulder);
      const gap = toBall.length() - reach;
      if (gap < SEEK && ball.pos.y > shoulder.y) {
        this.target.set(ball.pos.x, ball.pos.y, ball.pos.z);
        this.side = sideOf(a, ball.pos);
        this.two = false;
        want = Math.min(1, Math.max(0, 1 - gap / SEEK)) ** 0.7;
      }
    }
    if (act.kind !== "block") this.planned = this.struck = null;
    this.weight += (want - this.weight) * (1 - Math.exp(-dt * (want > this.weight ? 30 : 10)));
    this.placeSecond(shoulder);
  }

  /** The striking side, + for the right: a help leap swings from the side he comes from, the rest from the ball's side. */
  private sd(a: Athlete, preset: BlockPreset): 1 | -1 {
    if (preset === "help") return a.vx * Math.cos(a.yaw) - a.vz * Math.sin(a.yaw) >= 0 ? 1 : -1;
    return this.side === "R" ? 1 : -1;
  }

  /** Two hands: the palms either side of the ball, the leading one on its side. */
  private placeSecond(shoulder: THREE.Vector3): void {
    if (!this.two) return;
    strikeFrame(shoulder, this.target, this.side === "R" ? 1 : -1, f, r);
    this.second.copy(this.target).addScaledVector(r, -PALMS);
    this.target.addScaledVector(r, PALMS);
  }

  /** `home` set, the hand comes back toward it rather than on with the ball: a reach that missed falls back to him. */
  private startFollow(at: { x: number; y: number; z: number }, vel: { x: number; y: number; z: number }, path: HandPath, two: boolean, home: THREE.Vector3 | null = null): void {
    const dir = home ? new THREE.Vector3(home.x - at.x, 0, home.z - at.z) : new THREE.Vector3(vel.x, 0, vel.z);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    this.follow = { at: new THREE.Vector3(at.x, at.y, at.z), dir, age: 0, path, two };
    this.two = two;
  }

  /** The follow through: held a beat on a pin, then on the way the ball went and down, easing back into the leap. */
  private playFollow(dt: number): number {
    const t = this.follow!;
    t.age += dt;
    const p = t.path;
    if (t.age >= p.show) {
      this.follow = null;
      return 0;
    }
    const k = Math.max(0, t.age - p.hold) / Math.max(0.05, p.show - p.hold);
    const go = Math.sin(Math.min(1, k * 2) * Math.PI * 0.5);
    this.target.copy(t.at).addScaledVector(t.dir, p.through * go);
    this.target.y -= p.drop * go;
    return 1 - Math.max(0, (k - 0.45) / 0.55);
  }
}

/** The hand on the ball's side of him: his left is (cos yaw, -sin yaw). */
function sideOf(a: Athlete, p: { x: number; z: number }): "L" | "R" {
  return (p.x - a.x) * Math.cos(a.yaw) - (p.z - a.z) * Math.sin(a.yaw) >= 0 ? "L" : "R";
}

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};
