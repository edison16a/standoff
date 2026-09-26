import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "@/games/blade-clash/characters";
import type { FighterFrame } from "@/games/blade-clash/engine/frames";
import type { Slot } from "@/games/blade-clash/players";
import { PLAYER_COLOURS } from "../player-colours";
import { buildBlade, buildBody, type BodyParts } from "./placeholder-parts";

const UP = new THREE.Vector3(0, 1, 0);
/** Where the sword arm hangs from, in the fighter's own frame: forward, up, right. */
const SHOULDER = { f: 0.02, u: 1.45, r: 0.2 };

/**
 * One fighter in the hall, as simple shapes for now: a body that walks,
 * flinches, staggers, falls and cheers, an arm reaching to the sword
 * hand, and the blade exactly where the engine says it is. The blade is
 * the part that matters, so it is never smoothed or eased here.
 */
export class FighterView {
  readonly group = new THREE.Group();
  /** The blade tip and middle in the world, for trails and sparks. */
  readonly tip = new THREE.Vector3();
  readonly mid = new THREE.Vector3();
  readonly chest = new THREE.Vector3();
  visible = false;
  private parts: BodyParts | null = null;
  private blade: THREE.Group | null = null;
  private characterId: CharacterId | null = null;
  private readonly arm: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly basis = new THREE.Matrix4();
  private readonly edge = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly shoulder = new THREE.Vector3();
  private readonly hand = new THREE.Vector3();

  constructor(readonly slot: Slot) {
    this.arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 1, 10), new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6 }));
    this.group.add(this.arm);
  }

  update(frame: FighterFrame | undefined, floor: number): void {
    this.visible = Boolean(frame);
    this.group.visible = this.visible;
    if (!frame) return;
    if (frame.characterId !== this.characterId) this.swap(frame.characterId);
    const parts = this.parts!;
    this.pose(parts, frame, floor);
    this.placeSword(frame, floor);
  }

  dispose(): void {
    this.drop();
    this.arm.geometry.dispose();
    this.arm.material.dispose();
  }

  /** The body: where it stands, which way it faces, and what it is doing. */
  private pose(parts: BodyParts, frame: FighterFrame, floor: number): void {
    const t = frame.actionMs;
    parts.root.position.set(frame.x, floor, 0);
    parts.root.rotation.set(0, frame.facing === 1 ? 0 : Math.PI, 0);
    // Walking swings the legs in step with the distance covered.
    const stride = Math.sin(frame.x * frame.facing * 7) * Math.min(1, Math.abs(frame.speed) / 0.8) * 0.5;
    parts.legs[0].rotation.z = stride;
    parts.legs[1].rotation.z = -stride;
    let lean = 0;
    let lift = 0;
    let shake = 0;
    if (frame.action === "hit") lean = 0.35 * Math.max(0, 1 - t / 420);
    if (frame.action === "stagger") shake = Math.sin(t / 22) * 0.04 * Math.max(0, 1 - t / 380);
    if (frame.action === "defeat") lean = Math.min(1, t / 700) * (Math.PI / 2 - 0.15);
    if (frame.action === "victory") lift = Math.abs(Math.sin(t / 260)) * 0.25;
    parts.torso.rotation.z = lean;
    parts.root.position.y += lift;
    parts.root.position.z += shake;
    // A hit flashes the body in the hitter's colour, then it fades.
    const flash = frame.action === "hit" ? Math.max(0, 1 - t / 300) : 0;
    parts.skin.emissive.setHex(PLAYER_COLOURS[this.slot === 1 ? 2 : 1]);
    parts.skin.emissiveIntensity = flash * 1.5;
    this.chest.set(frame.x, floor + 1.2, 0);
  }

  /** The arm and the blade, straight from the engine's sword pose. */
  private placeSword(frame: FighterFrame, floor: number): void {
    const { sword } = frame;
    const down = frame.action === "defeat";
    this.hand.set(sword.hand.x, sword.hand.y + floor, sword.hand.z);
    this.dir.set(sword.dir.x, sword.dir.y, sword.dir.z);
    this.edge.set(sword.edge.x, sword.edge.y, sword.edge.z);
    if (down) {
      // Knocked down, the sword drops beside the fighter.
      this.hand.set(frame.x - frame.facing * 0.4, floor + 0.04, 0.5 * frame.facing);
      this.dir.set(-frame.facing, 0, 0.3).normalize();
      this.edge.set(0, 1, 0);
    }
    this.side.crossVectors(this.edge, this.dir);
    this.basis.makeBasis(this.edge, this.dir, this.side);
    this.blade!.position.copy(this.hand);
    this.blade!.quaternion.setFromRotationMatrix(this.basis);
    const length = CHARACTERS[frame.characterId].blade.length;
    this.tip.copy(this.hand).addScaledVector(this.dir, length);
    this.mid.copy(this.hand).addScaledVector(this.dir, length * 0.55);

    this.arm.visible = !down;
    this.shoulder.set(frame.x + SHOULDER.f * frame.facing, floor + SHOULDER.u, SHOULDER.r * frame.facing);
    const reach = this.hand.clone().sub(this.shoulder);
    this.arm.position.copy(this.shoulder).addScaledVector(reach, 0.5);
    this.arm.scale.set(1, Math.max(0.05, reach.length()), 1);
    this.arm.quaternion.setFromUnitVectors(UP, reach.normalize());
  }

  private swap(characterId: CharacterId): void {
    this.drop();
    this.characterId = characterId;
    this.parts = buildBody(characterId, PLAYER_COLOURS[this.slot]);
    this.blade = buildBlade(characterId, PLAYER_COLOURS[this.slot]);
    this.arm.material.color.setHex(this.parts.skin.color.getHex());
    this.group.add(this.parts.root, this.blade);
  }

  private drop(): void {
    for (const object of [this.parts?.root, this.blade]) {
      if (!object) continue;
      this.group.remove(object);
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
    this.parts = null;
    this.blade = null;
  }
}
