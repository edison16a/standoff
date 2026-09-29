import * as THREE from "three";
import type { RefereeView } from "../../engine/view";
import type { Kit, Look } from "../../roster";
import { smooth, type Context } from "../anim/frame";
import { gait } from "../anim/gait";
import { buildOf, LEFT, RIGHT, solveLeg, type Build } from "../anim/leg-ik";
import { applyPose, blendPoses, neutral, type Pose } from "../anim/pose";
import { buildBody, type Rig } from "../models/body";
import { FootLock } from "./foot-locks";
import { keepAboveTurf } from "./turf";

/** All in black with a touch of yellow at the cuffs, as referees dress. */
const KIT: Kit = { shirt: "#141518", trim: "#f5c518", shorts: "#141518", socks: "#141518", ink: "#f5c518" };
const LOOK: Look = { skin: "#d8a47f", hair: "#2a211b", hairStyle: "buzz", beard: "stubble", height: 1.82, build: 0.6, boots: "#111111", kit: KIT };

/**
 * The referee: jogs along the far side with play, sprints in for a foul,
 * and holds the yellow card high toward the player, then points to the
 * spot. The card is a real card in his right hand, seen only when shown.
 */
export class RefereeFigure {
  readonly rig: Rig;
  private readonly build: Build = buildOf(LOOK.height, LOOK.build);
  private readonly locks = { left: new FootLock(), right: new FootLock() };
  private readonly shown: Pose = neutral();
  private readonly card: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private last: { x: number; z: number } | null = null;
  private readonly move = { x: 0, y: 0, z: 1 };

  constructor(material: THREE.Material) {
    this.rig = buildBody({ look: LOOK, kit: KIT, name: "REFEREE", number: -1 }, material);
    // A playing card sized yellow card, held up by its lower edge.
    this.card = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.105, 0.004), new THREE.MeshStandardMaterial({ color: "#ffd400", emissive: "#6b5a00", roughness: 0.45 }));
    this.card.position.set(0, -0.06, 0.035);
    this.card.visible = false;
    this.rig.handR.add(this.card);
  }

  update(r: RefereeView, dt: number, time: number): void {
    const root = this.rig.root;
    root.position.set(r.x, 0, r.z);
    root.rotation.y = Math.PI / 2 - r.facing;
    root.updateWorldMatrix(true, false);
    const frame = gait(r.stride, r.speed, false, this.context(r), time, 3.1);
    const left = this.locks.left.resolve(frame.left, root, this.build, dt);
    const right = this.locks.right.resolve(frame.right, root, this.build, dt);
    if (left) solveLeg(frame.pose, LEFT, left, this.build);
    if (right) solveLeg(frame.pose, RIGHT, right, this.build);
    signal(frame.pose, r);
    blendPoses(this.shown, this.shown, frame.pose, 1 - Math.exp(-dt * 16));
    applyPose(this.rig, this.shown);
    root.updateMatrixWorld(true);
    keepAboveTurf(this.rig, this.shown, this.build);
    this.locks.left.remember(this.rig.ankleL);
    this.locks.right.remember(this.rig.ankleR);
    this.card.visible = r.action === "card" && r.actionT > 0.15;
  }

  /** The way the body travels, in its own frame, for the feet. */
  private context(r: RefereeView): Context {
    const c = Math.cos(r.facing);
    const s = Math.sin(r.facing);
    if (this.last && r.speed > 0.3) {
      const dx = r.x - this.last.x;
      const dz = r.z - this.last.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-5 && d < 1) {
        this.move.x = (dx * s - dz * c) / d;
        this.move.z = (dx * c + dz * s) / d;
      }
    }
    this.last = { x: r.x, z: r.z };
    return { build: this.build, lead: RIGHT, move: this.move, ball: { x: 0, y: 0.11, z: 3 } };
  }

  dispose(): void {
    this.card.geometry.dispose();
    this.card.material.dispose();
    this.rig.dispose();
  }
}

/** The arms: the card held straight up and toward the player, or an arm out pointing at the spot. */
function signal(p: Pose, r: RefereeView): void {
  if (r.action === "card") {
    const up = smooth(r.actionT / 0.3);
    p.shRX = -2.75 * up;
    p.shRZ = 0.15;
    p.elR = -0.05;
    p.shLX = 0.1;
    p.shLZ = 0.15;
    p.neckX = -0.12 * up;
    p.spineX = -0.05 * up;
  } else if (r.action === "point") {
    const out = smooth(r.actionT / 0.35);
    p.shRX = -1.45 * out;
    p.shRZ = 0.2;
    p.elR = -0.05;
  }
}
