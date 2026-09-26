import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "@/games/blade-clash/characters";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { FighterFrame } from "@/games/blade-clash/engine/frames";
import { otherSlot, type Slot } from "@/games/blade-clash/players";
import { PLAYER_COLOURS } from "../player-colours";
import { Animator } from "./anim/animator";
import type { TrailStyle } from "./characters";
import { FighterModel } from "./model/fighter-model";

/** How long a hit lights the body up, in game milliseconds. */
const FLASH_MS = 240;

/**
 * One fighter in the arena: the character model, animated from the
 * engine's frames. It also keeps the blade's tip and middle in the world
 * for the trails and sparks, and lights the energy blade's glow on the
 * fighters and the floor.
 */
export class FighterView {
  readonly group = new THREE.Group();
  /** The blade tip and middle in the world, for trails and sparks, and the chest for bursts. */
  readonly tip = new THREE.Vector3();
  readonly mid = new THREE.Vector3();
  readonly chest = new THREE.Vector3();
  visible = false;
  /** How fast the tip is moving, metres a second of game time. */
  tipSpeed = 0;
  private model: FighterModel | null = null;
  private animator: Animator | null = null;
  /**
   * The energy blade's light. It sits in the scene outside the fighter's
   * group and is always there, dark for other blades or no fighter at all,
   * since a light coming or going recompiles every shader.
   */
  readonly light = new THREE.PointLight(0xffffff, 0, 3.2, 2);
  private readonly flashColour: THREE.Color;
  private flashAt = -Infinity;
  private lastT: number | null = null;
  private lastFrame: FighterFrame | null = null;
  private readonly lastTip = new THREE.Vector3();
  private readonly bladeWorld = new THREE.Vector3();

  constructor(readonly slot: Slot) {
    this.flashColour = new THREE.Color(PLAYER_COLOURS[otherSlot(slot)]);
    this.light.color.set(PLAYER_COLOURS[slot]);
  }

  get characterId(): CharacterId | null {
    return this.model?.characterId ?? null;
  }

  get trail(): TrailStyle | null {
    return this.model?.look.trail ?? null;
  }

  /** The game's events that change how this fighter moves or looks. */
  react(event: GameEvent): void {
    if (event.type !== "hit" || event.victim !== this.slot || !this.animator || !this.lastFrame) return;
    const across = Math.max(-1, Math.min(1, (event.at.z * this.lastFrame.facing) / 0.2));
    this.animator.hurt(event.part, across);
    this.flashAt = event.t;
  }

  update(frame: FighterFrame | undefined, floor: number, t: number): void {
    this.visible = Boolean(frame);
    this.group.visible = this.visible;
    if (!frame) {
      this.lastT = null;
      this.light.intensity = 0;
      return;
    }
    if (frame.characterId !== this.model?.characterId) this.swap(frame.characterId);
    const model = this.model!;
    const dt = this.lastT === null || t < this.lastT ? 0 : t - this.lastT;
    this.lastT = t;
    this.lastFrame = frame;
    const pose = this.animator!.update(frame, dt);
    model.rig.update(pose);
    model.root.position.set(frame.x, floor, 0);
    model.root.rotation.y = frame.facing === 1 ? 0 : Math.PI;

    // The blade in the world, from the pose, which is the engine's sword unless an ending has taken it.
    const length = CHARACTERS[frame.characterId].blade.length;
    const toWorld = (v: THREE.Vector3, out: THREE.Vector3) => out.set(frame.x + v.x * frame.facing, floor + v.y, v.z * frame.facing);
    toWorld(pose.grip, this.mid).addScaledVector(this.worldBlade(pose.blade, frame.facing), length * 0.55);
    toWorld(pose.grip, this.tip).addScaledVector(this.worldBlade(pose.blade, frame.facing), length);
    this.chest.set(frame.x + pose.hips.x * frame.facing, floor + pose.hips.y + 0.3, 0);
    this.tipSpeed = dt > 0 ? (this.tip.distanceTo(this.lastTip) / dt) * 1000 : this.tipSpeed;
    this.lastTip.copy(this.tip);

    const since = t - this.flashAt;
    model.flash(this.flashColour, since >= 0 && since < FLASH_MS ? (1 - since / FLASH_MS) ** 2 : 0);
    if (model.energy) {
      const swing = Math.min(1, this.tipSpeed / 8);
      model.energy.shimmer(t, swing);
      this.light.position.copy(this.mid);
      this.light.intensity = frame.action === "defeat" ? 0.4 : 1.6 + swing * 1.2;
    } else {
      this.light.intensity = 0;
    }
  }

  dispose(): void {
    this.drop();
    this.light.dispose();
  }

  private worldBlade(blade: THREE.Vector3, facing: 1 | -1): THREE.Vector3 {
    return this.bladeWorld.set(blade.x * facing, blade.y, blade.z * facing);
  }

  private swap(characterId: CharacterId): void {
    this.drop();
    this.model = new FighterModel(characterId, PLAYER_COLOURS[this.slot]);
    this.animator = new Animator(this.model.look);
    this.lastT = null;
    this.group.add(this.model.root);
  }

  private drop(): void {
    if (!this.model) return;
    this.group.remove(this.model.root);
    this.model.dispose();
    this.model = null;
    this.animator = null;
  }
}
