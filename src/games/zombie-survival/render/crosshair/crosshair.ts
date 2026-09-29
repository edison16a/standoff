import * as THREE from "three";
import { WEAPONS, type WeaponId } from "../../engine/weapons";
import { buildReticle, type Reticle } from "./reticles";
import { Strokes } from "./strokes";

/** A spot straight ahead of the eye, on the plane one unit in front of it. */
export interface ViewSpot {
  x: number;
  y: number;
}

/** Crosshairs sit this far in front of the eye. Their parts are sized for one unit, so they are scaled by it. */
const DEPTH = 1;
/** How quickly a shot's pulse fades, per second. */
const PULSE_FADE = 7;
/** The kick must carry the gun this far off, in radians, before the mark of the aim shows. */
const ANCHOR_FROM = 0.004;

/**
 * One player's crosshair: their gun's own reticle where the gun points,
 * which jumps with each shot's kick and springs back, and a faint mark
 * at the spot their phone points, which the gun keeps returning to.
 */
export class Crosshair {
  readonly group = new THREE.Group();
  private readonly strokes: Strokes;
  private readonly anchorStrokes: Strokes;
  private readonly reticle: Reticle;
  private readonly anchor: THREE.Group;
  private pulse = 0;

  constructor(
    readonly weapon: WeaponId,
    colour: string,
  ) {
    this.strokes = new Strokes(colour);
    this.anchorStrokes = new Strokes(colour, 0.6);
    this.reticle = buildReticle(weapon, this.strokes);
    this.anchor = this.anchorStrokes.ring(0.0035, 0.0018);
    this.group.add(this.reticle.group, this.anchor);
  }

  fire(): void {
    this.pulse = 1;
  }

  /** `gun` is where the gun points and `aim` where the phone points, or null to hide it. */
  update(gun: ViewSpot | null, aim: ViewSpot | null, dt: number): void {
    this.group.visible = gun !== null;
    if (!gun) return;
    this.pulse = Math.max(0, this.pulse - dt * PULSE_FADE);
    this.reticle.open(WEAPONS[this.weapon].spread * (1 + this.pulse * 0.25));
    const scale = DEPTH * (1 + this.pulse * 0.12);
    this.reticle.group.position.set(gun.x * DEPTH, gun.y * DEPTH, -DEPTH);
    this.reticle.group.scale.setScalar(scale);
    const off = aim ? Math.hypot(gun.x - aim.x, gun.y - aim.y) : 0;
    this.anchor.visible = aim !== null && off > ANCHOR_FROM;
    if (aim) this.anchor.position.set(aim.x * DEPTH, aim.y * DEPTH, -DEPTH);
    this.anchor.scale.setScalar(DEPTH);
    this.anchorStrokes.fill.opacity = Math.min(0.7, (off - ANCHOR_FROM) * 40);
    this.anchorStrokes.edge.opacity = this.anchorStrokes.fill.opacity * 0.5;
  }

  dispose(): void {
    this.strokes.dispose();
    this.anchorStrokes.dispose();
  }
}
