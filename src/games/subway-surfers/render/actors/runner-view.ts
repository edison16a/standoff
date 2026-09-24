import * as THREE from "three";
import type { Run } from "../../engine/run";
import { JUMP, ROLL, RUNNER } from "../../engine/tuning";
import { cheerPose, crashPose, flyPose, idlePose, jumpPose, rollPose, runPose, boardPose } from "../anim/gaits";
import { Pose } from "../anim/pose";
import { addOutline } from "../outline";
import { MeshBuilder } from "../mesh-builder";
import { hoverboard } from "../models/pickups";
import type { Rig } from "../models/rig";
import { buildRunner, LOOKS } from "../models/runner-model";
import { shadowPaint } from "../models/train";

/** Metres of track per full stride, left and right foot. */
const STRIDE = 2.9;

export type Mood = "run" | "idle" | "cheer";

/**
 * One runner on screen: the rigged character, their hoverboard, jetpack
 * and glowing boots when they have them, and a soft shadow. Each frame it
 * reads the run and eases the body toward the pose for what is happening.
 */
export class RunnerView {
  readonly root = new THREE.Group();
  readonly rig: Rig;
  private readonly pose = new Pose();
  private readonly target = new Pose();
  private readonly board: THREE.Group;
  private readonly jetpack: THREE.Group;
  private readonly boots: THREE.Group[] = [];
  private readonly shadow: THREE.Mesh;
  private lastX = 0;
  private lean = 0;
  private flip = 0;

  constructor(look: number) {
    const style = LOOKS[look % LOOKS.length]!;
    this.rig = buildRunner(style);
    addOutline(this.rig.root);
    this.root.add(this.rig.root);
    const board = new MeshBuilder();
    hoverboard(board, style.board[0], style.board[1]);
    this.board = board.build("board");
    addOutline(this.board);
    this.board.position.y = 0.16;
    this.root.add(this.board);
    this.jetpack = buildJetpack();
    this.jetpack.position.set(0, 0.2, 0.2);
    this.rig.bones.chest.add(this.jetpack);
    for (const side of ["ankleL", "ankleR"] as const) {
      const glow = new MeshBuilder().sphere(0.13, { color: 0x3ddc84, finish: "glow" }, [0, 0.02, -0.04], [1, 0.8, 1.6], 10).build("boot-glow");
      this.rig.bones[side].add(glow);
      this.boots.push(glow);
    }
    const shadow = new THREE.PlaneGeometry(1.2, 1.2);
    shadow.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadow, shadowPaint());
    this.root.add(this.shadow);
  }

  /** Poses the runner from their run. `mood` is for the moments with no run going. */
  update(run: Run | null, dt: number, time: number, mood: Mood = "run"): void {
    const s = run?.runner;
    const powers = run?.powers;
    const x = s?.x ?? 0;
    const y = s?.y ?? 0;
    this.root.position.set(x, y, -(s?.distance ?? 0));
    const vx = dt > 0 ? (x - this.lastX) / dt : 0;
    this.lastX = x;
    this.lean += (vx / RUNNER.sideSpeed - this.lean) * (1 - Math.exp(-14 * dt));
    const board = !!powers?.has("hoverboard") && !run?.crashed;
    const flying = !!powers?.has("jetpack") && !run?.crashed;
    this.board.visible = board;
    this.jetpack.visible = flying;
    for (const glow of this.boots) glow.visible = !!powers?.has("boots");
    const flame = this.jetpack.getObjectByName("flame");
    if (flame) flame.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(time * 40)), 1);

    let rate = 16;
    let spin = 0;
    if (!run || mood !== "run") {
      if (mood === "cheer") cheerPose(this.target, time);
      else idlePose(this.target, time);
      rate = 8;
    } else if (run.crashed) {
      crashPose(this.target, run.time - run.crashed.time);
      rate = 30;
    } else if (flying) {
      flyPose(this.target, time);
      rate = 6;
    } else if (s!.rollLeft > 0) {
      rollPose(this.target);
      rate = 30;
      spin = -Math.PI * 2 * Math.min(1, s!.rollAge / ROLL.minS);
    } else if (!s!.grounded && s!.airTime > 0.04) {
      const top = Math.sqrt(2 * JUMP.gravity * (powers!.has("boots") ? JUMP.bootsHeight : JUMP.height));
      jumpPose(this.target, Math.max(-1, Math.min(1, s!.vy / top)));
      rate = 14;
      // Jump boots throw in a front flip.
      if (powers!.has("boots") && s!.vy < top * 0.95) spin = -Math.PI * 2 * Math.min(1, s!.airTime / 1.05);
    } else if (board) {
      boardPose(this.target, time);
      rate = 10;
    } else {
      runPose(this.target, (s!.distance / STRIDE) * Math.PI * 2, 1);
      rate = 22;
    }
    // Leaning into a lane change, body and head turning the way they go.
    const lean = Math.max(-1, Math.min(1, this.lean));
    this.target.add("spine", 0, 0, -0.35 * lean).add("hips", 0, -0.3 * lean, 0).add("head", 0, -0.3 * lean, 0.2 * lean);
    this.pose.approach(this.target, rate, dt);
    this.pose.apply(this.rig);
    this.rig.root.rotation.set(0, -0.35 * lean, -0.2 * lean);

    // Flips and rolls turn the whole body about its middle, then settle back upright the short way.
    if (spin !== 0) this.flip = spin;
    else {
      this.flip = Math.atan2(Math.sin(this.flip), Math.cos(this.flip));
      this.flip *= Math.exp(-18 * dt);
    }
    this.rig.pivot.rotation.x = this.flip;
    if (board) this.board.rotation.set(Math.sin(time * 5) * 0.05, 0, -0.25 * lean);

    // The shadow stays on the ground under them, shrinking as they rise.
    const ground = run ? groundBelow(run) : 0;
    const height = Math.max(0, y - ground);
    this.shadow.position.y = ground - y + 0.04;
    this.shadow.scale.setScalar(Math.max(0.35, 1 - height * 0.12));
    this.shadow.visible = height < 6;
  }

  dispose(): void {
    // Materials are shared. The geometry is this runner's own.
    this.root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && mesh !== this.shadow) mesh.geometry.dispose();
    });
    this.shadow.geometry.dispose();
  }
}

/** The surface under the runner: the ground, or a roof they are over. */
function groundBelow(run: Run): number {
  const s = run.runner;
  if (s.grounded) return s.y;
  return s.y > 3.3 && s.airTime < 2 ? Math.min(s.y, 3.4) : 0;
}

function buildJetpack(): THREE.Group {
  const b = new MeshBuilder();
  for (const x of [-0.1, 0.1]) {
    b.capsule(0.08, 0.26, { color: 0xff8a1f, finish: "gloss" }, [x, 0, 0.06]);
    b.post(0.06, 0.08, { color: 0x3a3f4b, finish: "metal" }, [x, -0.24, 0.06], 10, 0.08);
  }
  b.box(0.3, 0.3, 0.1, { color: 0x3a3f4b, finish: "satin" }, [0, 0.02, -0.02], undefined, 0.03);
  const group = b.build("jetpack");
  const flame = new MeshBuilder();
  for (const x of [-0.1, 0.1]) {
    flame.add(new THREE.ConeGeometry(0.07, 0.5, 10), { color: 0xffe14d, finish: "glow" }, [x, -0.5, 0.06], [Math.PI, 0, 0]);
    flame.add(new THREE.ConeGeometry(0.04, 0.3, 8), { color: 0xffffff, finish: "glow" }, [x, -0.42, 0.06], [Math.PI, 0, 0]);
  }
  const fire = flame.build("flame");
  fire.name = "flame";
  group.add(fire);
  return group;
}
