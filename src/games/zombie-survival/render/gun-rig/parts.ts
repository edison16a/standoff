import * as THREE from "three";
import type { WeaponId } from "../../engine/weapons";
import type { GunModel } from "../models/guns";
import { PART } from "../models/guns/moving-parts";
import type { GunPose, PartPose } from "./pose";
import { TRAVEL } from "./rest";

/** How much of the port the bolt face leaves showing when fully back. */
const PORT_OPEN = 0.85;
/** The AR's dust cover swings out and down this far, in radians. */
const COVER_SWING = 1.75;
/** The MP5's handle turns up this far into its notch. */
const HANDLE_LOCK = 0.7;

/** A part and where the model put it, so poses can be laid on as offsets. */
class Moving {
  readonly home: THREE.Vector3;
  readonly turn: THREE.Euler;

  constructor(readonly object: THREE.Object3D) {
    this.home = object.position.clone();
    this.turn = object.rotation.clone();
  }

  /** Puts the part at its home plus an offset, both in its parent's frame. */
  place(pose: PartPose, from: THREE.Vector3 = this.home): void {
    this.object.position.set(from.x + pose.pos[0], from.y + pose.pos[1], from.z + pose.pos[2]);
    this.object.rotation.set(this.turn.x + pose.rot[0], this.turn.y + pose.rot[1], this.turn.z + pose.rot[2]);
    this.object.visible = pose.shown > 0.5;
  }
}

const maybe = (o: THREE.Object3D | null | undefined) => (o ? new Moving(o) : null);

/**
 * The gun's moving parts, found on the model by field or by name, and
 * set from a pose each frame. Travel comes in as shares of a stroke and
 * leaves as distances, with the same numbers the hands ride on.
 */
export class GunParts {
  readonly magazine: Moving | null;
  private readonly spare: Moving | null;
  private readonly handle: Moving | null;
  private readonly pump: Moving | null;
  private readonly shell: Moving | null;
  private readonly slide: THREE.Object3D | null;
  private readonly cover: Moving | null;

  constructor(
    private readonly weapon: WeaponId,
    model: GunModel,
  ) {
    const named = (name: string) => model.root.getObjectByName(name) ?? null;
    this.magazine = maybe(model.magazine);
    this.spare = maybe(named(PART.spareMagazine));
    this.handle = maybe(model.bolt);
    this.pump = maybe(model.pump);
    this.shell = maybe(model.shell);
    this.slide = named(PART.portSlide);
    this.cover = maybe(named(PART.portCover));
  }

  apply(pose: GunPose): void {
    const travel = TRAVEL[this.weapon];
    this.magazine?.place(pose.mag);
    // The spare is posed from the magazine's home, where it will end up.
    if (this.spare) this.spare.place(pose.spare, this.magazine?.home);
    if (this.handle) {
      const { object, home, turn } = this.handle;
      object.position.set(home.x, home.y, home.z + pose.handle * travel.handle);
      object.rotation.set(turn.x, turn.y, turn.z - pose.handleLock * HANDLE_LOCK);
    }
    if (this.pump) this.pump.object.position.z = this.pump.home.z + pose.pump * travel.pump;
    this.shell?.place(pose.shell, ORIGIN);
    if (this.slide) this.slide.scale.z = Math.max(0.02, 1 - pose.carrier * PORT_OPEN);
    if (this.cover) this.cover.object.rotation.z = this.cover.turn.z - pose.cover * COVER_SWING;
  }
}

const ORIGIN = new THREE.Vector3();
