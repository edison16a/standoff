import * as THREE from "three";
import type { Run } from "../../engine/run";
import { runPose } from "../anim/gaits";
import { Pose } from "../anim/pose";
import { buildDog, buildGuard, type Dog } from "../models/guard-model";
import type { Rig } from "../models/rig";
import { shadowPaint } from "../models/train";

const STRIDE = 2.4;

/**
 * The guard and his dog, pounding along behind the runner when they are
 * close, one arm up shaking his fist. They follow the runner's lane a
 * beat late, and stop beside them for the catch.
 */
export class GuardView {
  readonly root = new THREE.Group();
  private readonly guard: Rig;
  private readonly dog: Dog;
  private readonly pose = new Pose();
  private readonly target = new Pose();
  private x = 0;
  private dogX = 0;

  constructor() {
    this.guard = buildGuard();
    this.dog = buildDog();
    this.root.add(this.guard.root, this.dog.root);
    for (const target of [this.guard.root, this.dog.root]) {
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), shadowPaint());
      shadow.position.y = 0.03;
      target.add(shadow);
    }
  }

  update(run: Run, dt: number, time: number): void {
    const s = run.runner;
    const gap = run.chase.gap;
    this.root.visible = gap < 14;
    if (!this.root.visible) return;
    const caught = run.crashed?.cause === "caught";
    const stopped = !!run.crashed;
    const follow = 1 - Math.exp(-(caught ? 10 : 4) * dt);
    this.x += (s.x - (caught ? 0.9 : 0) - this.x) * follow;
    this.dogX += (s.x + (caught ? 0.9 : 1.1) - this.dogX) * (1 - Math.exp(-3 * dt));
    const z = s.distance - gap;
    this.guard.root.position.set(this.x, 0, -z);
    this.dog.root.position.set(this.dogX, 0, -(z + 0.9 + Math.sin(time * 2) * 0.3));

    const pace = stopped ? time * 1.5 : (z / STRIDE) * Math.PI * 2;
    if (stopped && gap < 2) {
      runPose(this.target, pace, 0.1);
      this.target.set("shoulderR", 2.6, 0, 0.3 + 0.2 * Math.sin(time * 14)).set("elbowR", 0.6);
      this.target.set("shoulderL", 1.2, 0, -0.2).set("elbowL", 1.2);
    } else {
      runPose(this.target, pace, 0.9);
      // Shaking his fist with the whistle in it.
      this.target.set("shoulderR", 2.5 + 0.35 * Math.sin(time * 16), 0, 0.35).set("elbowR", 0.9 + 0.3 * Math.sin(time * 16));
    }
    this.target.add("spine", 0.1);
    this.pose.approach(this.target, 18, dt);
    this.pose.apply(this.guard);

    // The dog bounds: front and back legs in pairs, the body rocking.
    const gallop = stopped ? time * 20 : (z / 1.4) * Math.PI * 2;
    const a = Math.sin(gallop);
    this.dog.legs.forEach((leg, i) => (leg.rotation.x = (i < 2 ? 0.7 : -0.7) * a * (stopped ? 0.2 : 1)));
    this.dog.body.rotation.x = 0.12 * Math.cos(gallop);
    this.dog.body.position.y = 0.42 + 0.06 * Math.abs(Math.cos(gallop));
    this.dog.tail.rotation.z = Math.sin(time * 18) * 0.6;
    this.dog.head.rotation.x = stopped ? -0.3 + 0.1 * Math.sin(time * 20) : 0;
  }

  dispose(): void {
    this.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
  }
}
