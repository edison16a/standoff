import * as THREE from "three";
import type { CharacterId } from "@/games/fencing/characters";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { buildBlade } from "./blades";
import { BodyRig } from "./body-rig";
import { MODELS } from "./characters";
import { Dresser } from "./dresser";

/**
 * One fencer's model: the shared skeleton, dressed as a character, with
 * their weapon in hand and a faint aura along the blade that lights up in
 * the player's colour while a parry is open.
 */
export class FencerModel {
  readonly rig: BodyRig;
  private readonly aura: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private auraLevel = 0;

  constructor(
    readonly characterId: CharacterId,
    readonly trim: THREE.ColorRepresentation,
  ) {
    const model = MODELS[characterId];
    this.rig = new BodyRig(model.bladeLength);
    const dresser = new Dresser();
    model.dress(dresser, { trim });
    buildBlade(dresser.on("blade"), model.blade, model.bladeLength, model.bladeColours);
    dresser.finish(this.rig);
    this.rig.bones.head.scale.setScalar(1.12);
    this.rig.bones.handF.scale.setScalar(1.15);
    this.rig.bones.handB.scale.setScalar(1.15);

    const auraLength = model.bladeLength - 0.1;
    this.aura = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, auraLength, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: trim, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.aura.rotation.z = -Math.PI / 2;
    this.aura.position.x = 0.1 + auraLength / 2;
    this.aura.visible = false;
    this.rig.bones.blade.add(this.aura);
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  /** Eases the parry aura toward on or off, by the frame's own clock. */
  setParrying(on: boolean, dtMs: number): void {
    const k = 1 - Math.exp(-dtMs / (on ? 30 : 140));
    this.auraLevel += ((on ? 1 : 0) - this.auraLevel) * k;
    this.aura.visible = this.auraLevel > 0.02;
    this.aura.material.opacity = this.auraLevel * 0.55;
  }

  dispose(): void {
    disposeOwned(this.rig.root);
  }
}

/** A lone blade, for the showcase's key art and anything else that wants just the sword. */
export function bladeOnly(characterId: CharacterId): THREE.Group {
  const model = MODELS[characterId];
  const builder = new MeshBuilder();
  buildBlade(builder, model.blade, model.bladeLength, model.bladeColours);
  return builder.build(`${characterId}-blade`);
}
