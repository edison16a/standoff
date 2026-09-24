import * as THREE from "three";
import type { Course } from "../../engine/course";
import { laneX, TRAIN } from "../../engine/tuning";
import { frontAt, type Obstacle } from "../../engine/types";
import { highBarrier, lowBarrier, ramp } from "../models/barriers";
import { headlightGlow, trainCar, type CarRole } from "../models/train";

const VISIBLE = 200;

interface Shown {
  object: THREE.Group;
  obstacle: Obstacle;
  /** When a hoverboard smashed it, in seconds of view time, for the tumble. */
  smashedAt: number | null;
  spin: THREE.Vector3;
}

/**
 * The trains, barriers and ramps of one run, kept in step with the
 * course. Each obstacle gets a clone of a shared model when it comes into
 * view and loses it once the runner is past.
 */
export class ObstacleView {
  readonly group = new THREE.Group();
  private readonly shown = new Map<number, Shown>();
  private readonly seen = new Set<number>();
  private time = 0;

  update(course: Course, distance: number, dt: number): void {
    this.time += dt;
    this.seen.clear();
    for (const o of course.obstacles) {
      const front = frontAt(o, distance);
      if (front - distance > VISIBLE || front + o.length < distance - 20) continue;
      this.seen.add(o.id);
      let shown = this.shown.get(o.id);
      if (!shown) {
        shown = { object: build(o), obstacle: o, smashedAt: null, spin: new THREE.Vector3() };
        this.shown.set(o.id, shown);
        this.group.add(shown.object);
      }
      if (course.smashed.has(o.id) && shown.smashedAt === null) {
        shown.smashedAt = this.time;
        const s = (o.id % 7) / 7;
        shown.spin.set(4 + s * 3, (s - 0.5) * 6, (s - 0.5) * 8);
      }
      place(shown, front, this.time);
    }
    for (const [id, shown] of this.shown) {
      if (this.seen.has(id)) continue;
      this.group.remove(shown.object);
      this.shown.delete(id);
    }
  }

  clear(): void {
    this.group.clear();
    this.shown.clear();
  }
}

function place(shown: Shown, front: number, time: number): void {
  const { object, obstacle } = shown;
  object.position.set(laneX(obstacle.lane), 0, -front);
  if (shown.smashedAt === null) return;
  // Smashed by a hoverboard: it cartwheels up and away down the track.
  const t = time - shown.smashedAt;
  object.position.y = 6 * t - 9 * t * t + 0.3;
  object.position.z -= 14 * t;
  object.position.x += Math.sign(obstacle.lane || 1) * 5 * t;
  object.rotation.set(shown.spin.x * t, shown.spin.y * t, shown.spin.z * t);
  object.visible = t < 1.4;
}

function build(o: Obstacle): THREE.Group {
  switch (o.kind) {
    case "low":
      return lowBarrier(o.style);
    case "high":
      return highBarrier(o.style);
    case "ramp":
      return ramp();
    case "train":
      return train(o);
  }
}

function train(o: Obstacle): THREE.Group {
  const group = new THREE.Group();
  const lit = o.drift > 0;
  for (let i = 0; i < o.cars; i++) {
    const role: CarRole = o.cars === 1 ? "single" : i === 0 ? "front" : i === o.cars - 1 ? "rear" : "middle";
    // About one car in three carries a graffiti piece.
    const graffiti = (o.id + i) % 3 === 0 ? (o.id * 3 + i) % 4 : null;
    const car = trainCar(o.style, role, graffiti, lit);
    car.position.z = -i * (TRAIN.car + TRAIN.gap);
    group.add(car);
  }
  if (lit) {
    for (const x of [-0.72, 0.72]) {
      const glow = headlightGlow();
      glow.position.set(x, 1.05, 0.5);
      group.add(glow);
    }
  }
  return group;
}
