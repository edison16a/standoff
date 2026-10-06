/** What the body's springs feel this frame. */
export interface MotionInput {
  dt: number;
  /** Forward speed, m/s, negative in reverse. */
  speed: number;
  /** How fast the heading turns, rad/s, positive turning left. */
  yawRate: number;
  /** Vertical speed, m/s, so a landing knows how hard it was. */
  vy: number;
  airborne: boolean;
  /** How rough the ground is: 0 smooth tarmac, 1 kerbs and sand. */
  rough: number;
  time: number;
}

interface Spring {
  x: number;
  v: number;
  /** Natural frequency, Hz, and damping ratio. */
  hz: number;
  zeta: number;
}

const spring = (hz: number, zeta: number): Spring => ({ x: 0, v: 0, hz, zeta });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Advances one damped spring toward a target. Semi implicit, so it stays stable at any step. */
function pull(s: Spring, target: number, dt: number): void {
  const w = s.hz * Math.PI * 2;
  s.v += (-(w * w) * (s.x - target) - 2 * s.zeta * w * s.v) * dt;
  s.x += s.v * dt;
}

/**
 * The kart's body on its springs. Cornering rolls it toward the outside
 * of the bend, braking dips the nose and power squats the tail, landings
 * compress the springs and bounce back, and rough ground jiggles it.
 * Each axis is a damped spring chasing what the forces ask for, so it
 * overshoots a touch and settles, like real suspension.
 */
export class SuspensionMotion {
  private readonly rollS = spring(1.9, 0.42);
  private readonly pitchS = spring(2.2, 0.48);
  private readonly heaveS = spring(2.6, 0.36);
  private lastSpeed = 0;
  private accel = 0;
  private wasAir = false;
  private fall = 0;

  /** Radians: positive lifts the left (+x) side. */
  get roll(): number {
    return clamp(this.rollS.x, -0.12, 0.12);
  }

  /** Radians: positive dips the nose. */
  get pitch(): number {
    return clamp(this.pitchS.x, -0.09, 0.09);
  }

  /** Metres the body rides above (or below) its resting height. */
  get heave(): number {
    return clamp(this.heaveS.x, -0.12, 0.06);
  }

  step(i: MotionInput): void {
    const dt = Math.min(0.1, Math.max(0, i.dt));
    if (dt <= 0) return;
    const accelNow = (i.speed - this.lastSpeed) / dt;
    this.lastSpeed = i.speed;
    this.accel += (clamp(accelNow, -60, 60) - this.accel) * Math.min(1, dt * 8);
    if (i.airborne) this.fall = Math.max(this.fall, -i.vy);
    if (this.wasAir && !i.airborne) {
      // Touch down: the springs take the fall and push back.
      this.heaveS.v -= clamp(this.fall * 0.13, 0.15, 1.4);
      this.pitchS.v += clamp(this.fall * 0.02, 0, 0.25);
      this.fall = 0;
    }
    this.wasAir = i.airborne;
    const grip = i.airborne ? 0 : 1;
    const rollTo = clamp(i.speed * i.yawRate * 0.0075, -0.11, 0.11) * grip;
    const pitchTo = clamp(-this.accel * 0.0065, -0.07, 0.08) * grip;
    // Little bumps from the road, more over kerbs and sand, scaled by speed.
    const pace = Math.min(1, Math.abs(i.speed) / 18);
    const buzz = grip * pace * (0.004 + i.rough * 0.018) * (Math.sin(i.time * 31) + 0.6 * Math.sin(i.time * 47 + 1.3));
    const heaveTo = i.airborne ? 0.03 : buzz;
    const steps = Math.ceil(dt / (1 / 120));
    for (let k = 0; k < steps; k++) {
      pull(this.rollS, rollTo + buzz * 0.6, dt / steps);
      pull(this.pitchS, pitchTo, dt / steps);
      pull(this.heaveS, heaveTo, dt / steps);
    }
  }
}
