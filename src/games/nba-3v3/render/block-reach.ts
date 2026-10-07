import * as THREE from "three";
import type { BlockHit } from "../engine/blocks/hit";
import { TWO_HANDS } from "../engine/blocks/style";
import type { Athlete, Ball } from "../engine/types";

/** Within this much of full stretch past the arm's reach, an unplanned jump's hand still goes for the ball. */
const SEEK = 0.7;
/** The hand starts its strike this long before the planned touch. */
const STRIKE = 0.3;
/** How long a hit's follow through plays, by hit: a pin is held against the glass a beat. */
const SHOW: Record<BlockHit, number> = { swat: 0.34, tip: 0.26, spike: 0.3, pin: 0.45 };
/** How far the hand carries on through the ball, and how far down, by hit. */
const FOLLOW: Record<BlockHit, { through: number; drop: number }> = {
  swat: { through: 0.45, drop: 0.35 },
  tip: { through: 0.12, drop: -0.08 },
  spike: { through: 0.3, drop: 0.95 },
  pin: { through: 0.06, drop: 0.05 },
};

const toBall = new THREE.Vector3();
const windup = new THREE.Vector3();
const aim = new THREE.Vector3();

export interface BlockTouch {
  at: { x: number; y: number; z: number };
  tip: boolean;
  hit?: BlockHit;
}

/**
 * A shot blocker's hands, timed by the engine's block plan. The plan
 * says when and where the ball comes to him, so the hand winds up and
 * strikes to arrive on that spot at that moment: through the ball on a
 * swat, over the top and down on a spike, flat to the glass on a pin,
 * a flick on a tip. On a near miss it reaches to full stretch for the
 * spot and falls just short, then drops away. Standing, running and
 * help blocks go up with both hands; a chase down reaches with one.
 */
export class BlockReach {
  /** Where the reaching palm should be, the arm doing it, and how much (0 to 1). */
  readonly target = new THREE.Vector3();
  /** The other palm, beside the first, when both hands go up. */
  readonly second = new THREE.Vector3();
  side: "L" | "R" = "R";
  weight = 0;
  two = false;
  private touch: (BlockTouch & { age: number; dir: THREE.Vector3; hit: BlockHit }) | null = null;

  /** The engine's block: where the hand met the ball, and which way the ball went off. */
  hit(a: Athlete, t: BlockTouch, ballVel: { x: number; y: number; z: number }): void {
    const dir = new THREE.Vector3(ballVel.x, 0, ballVel.z);
    if (dir.lengthSq() > 1e-6) dir.normalize();
    this.touch = { ...t, age: 0, dir, hit: t.hit ?? (t.tip ? "tip" : "swat") };
    // A touch nobody saw coming (a pass knocked away) uses the hand on the ball's side.
    if (this.weight < 0.3) this.side = sideOf(a, t.at);
  }

  update(a: Athlete, ball: Ball | null, shoulder: THREE.Vector3, reach: number, dt: number): void {
    const act = a.action;
    const plan = act.kind === "block" ? act.plan : undefined;
    let want = 0;
    this.two = act.kind === "block" && TWO_HANDS[act.style] && this.touch?.hit !== "spike";
    if (this.touch) want = this.follow(dt);
    else if (act.kind === "block" && plan) {
      const lead = plan.at - act.t;
      this.side = sideOf(a, plan.point);
      if (lead < STRIKE && lead > -0.25) {
        // Wound up overhead, then the strike: eased so the palm arrives on the spot as the ball does.
        const k = smooth(1 - Math.max(0, lead) / STRIKE);
        windup.copy(shoulder).y += reach * 0.85;
        aim.set(plan.point.x, plan.point.y, plan.point.z);
        // In the last instant the hand is on the real ball, so it truly meets it.
        if (plan.hit && ball && lead < 0.05 && ball.mode === "flight") aim.set(ball.pos.x, ball.pos.y, ball.pos.z);
        this.target.lerpVectors(windup, aim, k);
        // A near miss: past the spot the empty hand sinks away.
        if (lead < 0) this.target.y += lead * 1.6;
        want = lead < 0 ? Math.max(0, 1 + lead * 4) : 0.4 + 0.6 * k;
      }
    } else if (ball && act.kind === "block" && a.y > 0.05 && ball.mode === "flight") {
      toBall.set(ball.pos.x, ball.pos.y, ball.pos.z).sub(shoulder);
      const gap = toBall.length() - reach;
      if (gap < SEEK && ball.pos.y > shoulder.y) {
        this.target.set(ball.pos.x, ball.pos.y, ball.pos.z);
        this.side = sideOf(a, ball.pos);
        want = Math.min(1, Math.max(0, 1 - gap / SEEK)) ** 0.7;
      }
    }
    this.weight += (want - this.weight) * (1 - Math.exp(-dt * (want > this.weight ? 30 : 10)));
    // The other hand rides beside the first, a palm's width across toward his middle.
    const across = this.side === "R" ? 1 : -1;
    this.second.copy(this.target).add({ x: Math.cos(a.yaw) * 0.24 * across, y: -0.04, z: -Math.sin(a.yaw) * 0.24 * across });
  }

  /** The follow through of a hit: through the ball and on the way the hit sends it, then easing back into the jump. */
  private follow(dt: number): number {
    const t = this.touch!;
    const k = (t.age += dt) / SHOW[t.hit];
    if (k >= 1) {
      this.touch = null;
      return 0;
    }
    const f = FOLLOW[t.hit];
    const go = Math.sin(Math.min(1, k * (t.hit === "spike" ? 3 : 2)) * Math.PI * 0.5);
    this.target.set(t.at.x, t.at.y, t.at.z).addScaledVector(t.dir, f.through * go);
    this.target.y -= f.drop * go;
    return 1 - Math.max(0, (k - 0.5) / 0.5);
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
