import * as THREE from "three";

/**
 * A critically damped spring: follows its target smoothly, fast at first
 * and settling without overshoot. `hz` is roughly how many times a
 * second it can follow a change. Used for every body part that moves.
 */
export class Spring {
  value: number;
  private velocity = 0;

  constructor(initial = 0) {
    this.value = initial;
  }

  update(target: number, dt: number, hz: number): number {
    const omega = hz * Math.PI * 2;
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.value - target;
    const temp = (this.velocity + omega * change) * dt;
    this.velocity = (this.velocity - omega * temp) * decay;
    this.value = target + (change + temp) * decay;
    return this.value;
  }

  snap(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}

/** Three springs for a point, so a hand target never teleports. */
export class SpringVector {
  readonly value = new THREE.Vector3();
  private readonly springs = [new Spring(), new Spring(), new Spring()];
  private primed = false;

  update(target: THREE.Vector3, dt: number, hz: number): THREE.Vector3 {
    if (!this.primed) return this.snap(target);
    this.value.set(this.springs[0]!.update(target.x, dt, hz), this.springs[1]!.update(target.y, dt, hz), this.springs[2]!.update(target.z, dt, hz));
    return this.value;
  }

  snap(target: THREE.Vector3): THREE.Vector3 {
    this.primed = true;
    this.springs.forEach((s, i) => s.snap(target.getComponent(i)));
    return this.value.copy(target);
  }
}

/**
 * A wobble that is struck and rings down, like a head snapping back from
 * a punch and settling. `hit` adds speed; the value swings and fades.
 */
export class Kick {
  value = 0;
  private velocity = 0;

  constructor(
    private readonly stiffness = 140,
    private readonly damping = 13,
  ) {}

  hit(speed: number): void {
    this.velocity += speed;
  }

  update(dt: number): number {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.velocity += (-this.stiffness * this.value - this.damping * this.velocity) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}
