import * as THREE from "three";
import type { KeeperView } from "../../engine/view";
import { TEAMS, type TeamId } from "../../teams";
import { keeperFrame } from "../anim/keeper-moves";
import { buildOf, type Build } from "../anim/leg-ik";
import { applyPose, ease, neutral, type Pose } from "../anim/pose";
import { buildBody, type Rig } from "../models/body";
import { keepAboveTurf } from "./turf";

/** A computer keeper in goal: gloves, long sleeves and the dives. */
export class KeeperFigure {
  readonly rig: Rig;
  private readonly build: Build;
  private readonly pose: Pose = neutral();
  private lastX = 0;
  private lastZ = 0;

  constructor(team: TeamId, material: THREE.Material) {
    const t = TEAMS[team];
    this.rig = buildBody({ look: t.keeperLook, kit: t.keeper, name: "KEEPER", number: 1, keeper: true }, material);
    this.build = buildOf(t.keeperLook.height, t.keeperLook.build);
  }

  update(k: KeeperView, dt: number, time: number): void {
    const speed = dt > 0 ? Math.hypot(k.x - this.lastX, k.z - this.lastZ) / dt : 0;
    this.lastX = k.x;
    this.lastZ = k.z;
    // The keeper's own left, in the world, decides which way a roll tips the body.
    const leftZ = -Math.cos(k.facing);
    const diveDir = k.dive?.dir ?? 1;
    const leftSign = leftZ * diveDir > 0 ? -1 : 1;
    const frame = keeperFrame(k, time, speed, leftSign);
    const snappy = k.action === "dive" || k.action === "getup";
    ease(this.pose, frame.pose, 1 - Math.exp(-dt * (snappy ? 30 : 14)));
    applyPose(this.rig, this.pose);
    this.rig.root.position.set(k.x, 0, frame.z);
    this.rig.root.rotation.y = Math.PI / 2 - k.facing;
    // The crouch and the dives are set by joint angles; the boots still stay out of the turf.
    keepAboveTurf(this.rig, this.pose, this.build);
  }

  dispose(): void {
    this.rig.dispose();
  }
}
