import * as THREE from "three";
import { SHOOT, PASS } from "../../engine/tuning";
import type { AthleteView } from "../../engine/view";
import { ROSTER, type Character, type Kit } from "../../roster";
import { celebration, cheer, dejected } from "../anim/celebrations";
import { charging, getUp, hurdle, idle, mirror, pass, run, shoot, slide, stumble } from "../anim/moves";
import { applyPose, ease, neutral, type Pose } from "../anim/pose";
import { buildBody, type Rig } from "../models/body";

/**
 * One footballer on the pitch: their body in the team's kit, easing from
 * pose to pose as the match view says what they are doing.
 */
export class AthleteFigure {
  readonly rig: Rig;
  readonly character: Character;
  private readonly pose: Pose = neutral();
  private readonly phase: number;

  constructor(view: AthleteView, kit: Kit, material: THREE.Material) {
    this.character = ROSTER[view.character];
    const c = this.character;
    this.rig = buildBody({ look: c.look, kit, name: c.short, number: c.number }, material);
    this.phase = view.id * 1.7;
  }

  update(view: AthleteView, dt: number, time: number): void {
    const target = this.target(view, time);
    // Kicks and slides snap in quickly; everything else blends softly.
    const quick = view.action === "shoot" || view.action === "pass" || view.action === "slide" || view.action === "stumble";
    ease(this.pose, target, 1 - Math.exp(-dt * (quick ? 40 : 16)));
    applyPose(this.rig, this.pose);
    this.rig.root.position.set(view.x, 0, view.z);
    this.rig.root.rotation.y = Math.PI / 2 - view.facing;
  }

  private target(v: AthleteView, time: number): Pose {
    const lefty = this.character.foot === "left";
    switch (v.action) {
      case "free":
        if (v.charge > 0) return this.footed(charging(v.stride, v.speed, v.charge), lefty);
        return v.speed > 0.35 ? run(v.stride, v.speed, v.hasBall) : idle(time, this.phase);
      case "shoot":
        return this.footed(shoot(v.actionT, SHOOT.windup, v.power), lefty);
      case "pass":
        return this.footed(pass(v.actionT, PASS.windup), lefty);
      case "slide":
        return slide(v.actionT);
      case "getup":
        return getUp(v.actionT, v.actionLen);
      case "stumble":
        return stumble(v.actionT);
      case "hurdle":
        return hurdle(v.actionT, v.actionLen);
      case "celebrate":
        return v.signature ? celebration(this.character.celebration, v.actionT) : cheer(v.actionT, this.phase);
      case "dejected":
        return dejected(v.actionT, this.phase);
    }
  }

  private footed(pose: Pose, lefty: boolean): Pose {
    return lefty ? mirror(pose) : pose;
  }

  dispose(): void {
    this.rig.dispose();
  }
}
