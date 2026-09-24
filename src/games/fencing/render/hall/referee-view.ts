import * as THREE from "three";
import type { Slot } from "@/games/fencing/players";
import { v2 } from "@/games/fencing/rig/geometry";
import type { Pose } from "@/games/fencing/rig/skeleton";
import { dressBody, face, onTorso } from "../fencer/anatomy";
import { BodyRig } from "../fencer/body-rig";
import { Dresser } from "../fencer/dresser";
import { disposeOwned } from "../kit/mesh-builder";
import { cloth, leather, satin, skin } from "../kit/materials";

const STANDING: Pose = {
  hips: v2(0, 0.93),
  lean: 0,
  twist: 0,
  nod: 0.05,
  frontFoot: v2(0.02, 0),
  backFoot: v2(-0.02, 0),
  hand: v2(0.06, -0.5),
  bladeAngle: -1.2,
  bladeYaw: 0,
  wrist: 0,
  backHand: v2(0.05, -0.5),
};
/** Where a signalling hand goes: up and out toward the fencer who scored. */
const SIGNAL = v2(0.4, 0.3);
/** Facing the camera, from behind the strip. */
const FACING = -Math.PI / 2;

/**
 * The referee, in a dark blazer and a tie, standing behind the strip at
 * the centre. They watch the bout, turning to follow it, and when a touch
 * lands they turn to the scorer and raise an arm, as a real referee does.
 */
export class RefereeView {
  readonly group = new THREE.Group();
  private readonly rig = new BodyRig(0.1, true);
  private signal: { slot: Slot; at: number } | null = null;
  private turn = 0;

  constructor() {
    const d = new Dresser();
    const blazer = cloth(0x1b1f2e, 0.72);
    const hand = skin(0xd9a47e);
    dressBody(d, {
      top: blazer, sleeve: blazer, glove: hand, freeHand: hand,
      seat: cloth(0x2c2f38, 0.8), thigh: cloth(0x2c2f38, 0.8), shin: cloth(0x2c2f38, 0.8),
      shoe: leather(0x0e0f12, 0.35), sole: leather(0x0a0a0a, 0.7),
    });
    const chest = d.on("chest");
    // White shirt at the collar, a purple tie, and a badge on the breast pocket.
    chest.cylinder(0.062, 0.07, 0.05, cloth(0xf4f4f0, 0.7), [0, 0.51, 0], [0, 0, 0], 18, [0.9, 1, 1.05]);
    chest.tube([onTorso(0.49, 0, 1, 0.006), onTorso(0.38, 0, 1, 0.008), onTorso(0.22, 0, 1, 0.01)], 0.016, satin(0x7c3aed), 12, 4);
    chest.box(0.01, 0.05, 0.04, satin(0xffd23f), onTorso(0.37, 0.55, 1, 0.006), [0, 0.55, 0], 0.004);
    const head = d.on("head");
    face(head, { skin: skin(0xd9a47e), brow: cloth(0x3b3b3b, 0.9), eye: satin(0x222222), white: satin(0xf2f0ea) });
    head.sphere(0.103, cloth(0x3a3a3a, 0.95), [-0.018, 0.215, 0], [0.98, 0.95, 0.95], 18);
    d.finish(this.rig);
    this.rig.bones.blade.visible = false;
    this.group.add(this.rig.root);
    this.group.position.set(0, 0, -2.25);
    this.group.rotation.y = FACING;
  }

  /** A touch: turn to the scorer and raise the arm on that side. */
  point(slot: Slot, t: number): void {
    this.signal = { slot, at: t };
  }

  /** `watchX` is where the action is, so the referee's head can follow it. */
  update(t: number, watchX: number): void {
    const since = this.signal ? t - this.signal.at : Infinity;
    const raise = since < 2400 ? Math.min(1, since / 180) * Math.min(1, (2400 - since) / 400) : 0;
    const toward = this.signal?.slot === 1 ? -1 : 1;
    const breath = Math.sin(t / 1100) * 0.006;
    const pose: Pose = { ...STANDING, hips: v2(0, STANDING.hips.y + breath) };
    if (raise > 0 && this.signal) {
      const lerp = (from: { x: number; y: number }) => v2(from.x + (SIGNAL.x - from.x) * raise, from.y + (SIGNAL.y - from.y) * raise);
      if (this.signal.slot === 1) pose.hand = lerp(STANDING.hand);
      else pose.backHand = lerp(STANDING.backHand);
    }
    this.rig.update(pose);
    const look = Math.max(-0.7, Math.min(0.7, Math.atan2(watchX, 2.7)));
    const target = raise > 0 ? toward * 0.55 * raise : 0;
    this.turn += (target - this.turn) * 0.08;
    this.group.rotation.y = FACING - this.turn;
    this.rig.bones.head.rotateY(-(look * (1 - raise)) - this.turn * 0.3);
  }

  dispose(): void {
    disposeOwned(this.group);
  }
}
