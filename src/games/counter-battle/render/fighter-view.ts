import * as THREE from "three";
import type { Fighter } from "../engine/fighter";
import type { MatchState } from "../engine/match";
import { RULES } from "../engine/tuning";
import { TEAMS } from "../teams";
import { readFighter } from "./anim/anim-input";
import { Animator } from "./anim/animator";
import { bump, smooth } from "./anim/curves";
import { buildCharacter, type CharacterModel } from "./models/character";
import { buildGun, type GunModel } from "./models/guns";
import { tubeZ } from "./models/guns/gun-kit";
import { paint } from "./geo";
import { NameTag } from "./name-tag";

/** What the host calls a fighter and the colour it shows them in. */
export interface Label {
  name: string;
  color: string;
}

const v = new THREE.Vector3();

/**
 * One fighter in the arena: their character in their team's colours, the
 * gun they chose, the animator that poses them from the engine, and the
 * name tag over their head. When they go down the gun falls from their
 * hands and lies on the turf until the next round.
 */
export class FighterView {
  readonly model: CharacterModel;
  readonly gun: GunModel;
  readonly tag: NameTag;
  readonly animator: Animator;
  private readonly shell: THREE.Mesh;
  private drop: { from: THREE.Vector3; fromQ: THREE.Quaternion; to: THREE.Vector3; toQ: THREE.Quaternion; at: number } | null = null;

  constructor(readonly id: number, f: Fighter, label: Label, private readonly scene: THREE.Object3D) {
    const team = TEAMS[f.team];
    this.model = buildCharacter(f.character, { team: team.color, dark: team.dark, player: label.color });
    this.gun = buildGun(f.gun.id, team.color);
    this.shell = new THREE.Mesh(paint(tubeZ(0.011, 0.011, 0.065, 8), "#b3261e", { rot: [Math.PI / 2, 0, 0], at: [0, -0.07, 0.03] }), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
    this.animator = new Animator(this.model.rig, this.gun, f.character, id * 7 + 3, this.shell);
    this.tag = new NameTag(label.name, label.color, team.color);
    scene.add(this.model.rig.root, this.tag.group);
  }

  get root(): THREE.Group {
    return this.model.rig.root;
  }

  /** Poses the fighter for this frame. `pushLocal` is which way a killing shot shoves the body. */
  update(f: Fighter, now: number, match: MatchState, wonAt: number | null, dt: number, pushLocal: { x: number; z: number }): void {
    const input = readFighter(f, now, match, wonAt);
    if (f.alive && this.drop) {
      this.drop = null;
      this.animator.parts.reattach();
    }
    this.animator.update(input, dt, pushLocal);
    if (!f.alive && !this.drop && this.animator.fallen) this.letGo(now);
    if (this.drop) this.fallGun(now);
    // The tag rides over the head, and sinks with the body when it falls.
    this.model.rig.head.getWorldPosition(v);
    this.tag.group.position.set(v.x, Math.max(0.4, v.y + 0.3), v.z);
    this.tag.setHealth(f.health / RULES.health);
  }

  /** The tip of the barrel in the world, for flashes and tracers. */
  muzzle(out: THREE.Vector3): THREE.Vector3 {
    return this.gun.muzzle.getWorldPosition(out);
  }

  /** The head in the world, for the camera and for checking who can see whom. */
  head(out: THREE.Vector3): THREE.Vector3 {
    return this.model.rig.head.getWorldPosition(out);
  }

  /** Lets go of the gun: it drops and tumbles to lie on the turf beside the body. */
  private letGo(now: number): void {
    const g = this.gun.root;
    this.animator.parts.detach(this.scene);
    const from = g.position.clone();
    const side = new THREE.Vector3(0.55, 0, 0.35).applyQuaternion(this.root.quaternion);
    const to = new THREE.Vector3(from.x + side.x, 0.04, from.z + side.z);
    const toQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.root.rotation.y + 1.1, Math.PI / 2, "YXZ"));
    this.drop = { from, fromQ: g.quaternion.clone(), to, toQ, at: now };
  }

  private fallGun(now: number): void {
    const d = this.drop!;
    const t = Math.min(1, (now - d.at) / 0.55);
    const g = this.gun.root;
    g.position.lerpVectors(d.from, d.to, smooth(t));
    // A little toss up before gravity takes it, and one bounce on landing.
    g.position.y = d.from.y + (d.to.y - d.from.y) * t * t + 0.15 * bump(t * 1.4) + 0.05 * bump((t - 0.8) / 0.2);
    g.quaternion.slerpQuaternions(d.fromQ, d.toQ, smooth(t));
  }

  dispose(): void {
    this.scene.remove(this.model.rig.root, this.tag.group, this.gun.root);
    this.model.dispose();
    this.gun.dispose();
    this.tag.dispose();
    this.shell.geometry.dispose();
    (this.shell.material as THREE.Material).dispose();
  }
}
