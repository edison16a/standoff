import * as THREE from "three";
import type { RunEvent } from "../../engine/events";
import type { Run } from "../../engine/run";
import type { RunnerState } from "../../engine/runner";
import { airTime, launchSpeed } from "../../engine/motion";
import { JUMP, ROLL, SIDE } from "../../engine/tuning";
import { boardPose, cheerPose, crashPose, flyPose, idlePose, jumpPose, rollPose, runPose } from "../anim/gaits";
import { Pose } from "../anim/pose";
import { Reactions } from "../anim/reactions";
import { addOutline } from "../outline";
import { MeshBuilder } from "../mesh-builder";
import { hoverboard } from "../models/pickups";
import type { Rig } from "../models/rig";
import { buildRunner, LOOKS } from "../models/runner-model";
import { shadowPaint } from "../models/train";
import { GroundContact } from "./ground-contact";
import { buildJetpack } from "./jetpack";
import { shadowFloor } from "./shadow-floor";

/** Metres of track per full stride, left and right foot. */
const STRIDE = 2.9;
/** The top of the hoverboard's deck over the runner's feet, where their shoes stand while they ride. */
const DECK = 0.21;

export type Mood = "run" | "idle" | "cheer";

/**
 * One runner on screen: the rigged character, their hoverboard, jetpack
 * and glowing sneakers when they have them, and a soft shadow. Each frame
 * it reads the run and eases the body toward the pose for what is
 * happening, with a jolt laid over it for a stumble and a squash on landing.
 */
export class RunnerView {
  readonly root = new THREE.Group();
  readonly rig: Rig;
  private readonly pose = new Pose();
  private readonly target = new Pose();
  private readonly reactions = new Reactions();
  private readonly board: THREE.Group;
  private readonly jetpack: THREE.Group;
  private readonly boots: THREE.Group[] = [];
  private readonly shadow: THREE.Mesh;
  private readonly contact: GroundContact;
  private lastX = 0;
  private lean = 0;
  private flip = 0;
  private clock = 0;

  constructor(look: number) {
    const style = LOOKS[look % LOOKS.length]!;
    this.rig = buildRunner(style);
    addOutline(this.rig.root);
    this.contact = new GroundContact(this.rig);
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
      const glow = new MeshBuilder().sphere(0.14, { color: 0x3ddc84, finish: "glow" }, [0, -0.07, -0.06], [1, 0.75, 1.6], 10).build("boot-glow");
      this.rig.bones[side].add(glow);
      this.boots.push(glow);
    }
    const shadow = new THREE.PlaneGeometry(1.2, 1.2);
    shadow.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadow, shadowPaint());
    this.root.add(this.shadow);
  }

  /** A new run starts from where it stands, with no lean, flip or stumble left over from the last. */
  reset(run: Run): void {
    this.lastX = run.runner.x;
    this.lean = 0;
    this.flip = 0;
    this.reactions.reset();
  }

  /** The moments the body reacts to on top of its pose: a knock off a train, a heavy landing. */
  onEvent(event: RunEvent, runner?: RunnerState): void {
    this.reactions.onEvent(event, this.clock, runner);
  }

  /** Poses the runner from their run. `mood` is for the moments with no run going. */
  update(run: Run | null, dt: number, time: number, mood: Mood = "run"): void {
    this.clock = time;
    const s = run?.runner;
    const powers = run?.powers;
    const x = s?.x ?? 0;
    const y = s?.y ?? 0;
    this.root.position.set(x + this.reactions.shove(time), y, -(s?.distance ?? 0));
    const vx = dt > 0 ? (x - this.lastX) / dt : 0;
    this.lastX = x;
    this.lean += (vx / SIDE.maxSpeed - this.lean) * (1 - Math.exp(-14 * dt));
    const board = !!powers?.has("hoverboard") && !run?.crashed;
    const flying = !!powers?.has("jetpack") && !run?.crashed;
    // The board is put away while the jetpack flies, and comes back for the landing.
    this.board.visible = board && !flying;
    this.jetpack.visible = flying;
    // Safe for a moment after a save or a flight: the body blinks, the way the real game shows it.
    const safe = !!s && s.ghost > 0 && !flying && !run?.crashed;
    this.rig.root.visible = !safe || Math.floor(time * 16) % 2 === 0;
    for (const glow of this.boots) glow.visible = !!powers?.has("boots");
    const flame = this.jetpack.getObjectByName("flame");
    if (flame) flame.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(time * 40)), 1);

    let rate = 16;
    let spin = 0;
    let running = false;
    // Whether the body stands, runs or rolls on the floor, and is brought down onto it.
    let settle = false;
    if (!run || mood !== "run") {
      if (mood === "cheer") cheerPose(this.target, time);
      else idlePose(this.target, time);
      settle = mood !== "cheer";
      rate = 8;
    } else if (run.crashed) {
      crashPose(this.target, run.time - run.crashed.time);
      settle = !!s?.grounded;
      rate = 30;
    } else if (flying) {
      flyPose(this.target, time);
      rate = 6;
    } else if (s!.rollLeft > 0) {
      rollPose(this.target);
      settle = s!.grounded;
      rate = 30;
      spin = -Math.PI * 2 * Math.min(1, s!.rollAge / ROLL.minS);
    } else if (!s!.grounded && s!.airTime > 0.04) {
      const top = launchSpeed(powers!.has("boots") ? JUMP.bootsHeight : JUMP.height);
      jumpPose(this.target, Math.max(-1, Math.min(1, s!.vy / top)));
      rate = 14;
      // Super sneakers throw in a front flip, eased in and out, done before the feet come down.
      if (powers!.has("boots") && s!.vy < top * 0.95) {
        const t = Math.min(1, s!.airTime / (airTime(JUMP.bootsHeight) * 0.8));
        spin = -Math.PI * 2 * t * t * (3 - 2 * t);
      }
    } else if (board) {
      boardPose(this.target, time);
      settle = true;
      rate = 10;
    } else {
      runPose(this.target, (s!.distance / STRIDE) * Math.PI * 2, 1);
      rate = 22;
      running = true;
      settle = true;
    }
    this.reactions.apply(this.target, running || board, time);
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
    // Nothing sinks into the ground or the deck: planted feet stay on it, and a roll tumbles over it.
    if (!flying) this.contact.plant(this.board.visible ? DECK : 0, settle);

    // The shadow stays on the ground under them, shrinking as they rise.
    const ground = run ? shadowFloor(run) : 0;
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
