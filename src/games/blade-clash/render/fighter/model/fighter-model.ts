import * as THREE from "three";
import { CHARACTERS, type CharacterId } from "@/games/blade-clash/characters";
import { disposeOwned } from "../../kit/mesh-builder";
import { buildWeapon } from "../blades";
import type { EnergyBlade } from "../blades/energy-blade";
import { MODELS, type CharacterModel } from "../characters";
import { BodyRig } from "../rig/body-rig";
import { Dresser } from "./dresser";
import { LookKit } from "./look-kit";

/**
 * One fighter's model: the shared skeleton, dressed as a character, with
 * their weapon on the sword bone. It owns its materials, so it can flash
 * in the hitter's colour on its own.
 */
export class FighterModel {
  readonly rig = new BodyRig();
  readonly look: CharacterModel;
  readonly energy: EnergyBlade | null;
  private readonly kit = new LookKit();

  constructor(
    readonly characterId: CharacterId,
    trim: THREE.ColorRepresentation,
  ) {
    this.look = MODELS[characterId];
    const colour = new THREE.Color(trim);
    const dresser = new Dresser();
    this.look.dress(dresser, this.kit, colour);
    this.energy = buildWeapon(dresser.on("sword"), this.kit, this.look.weapon, CHARACTERS[characterId].blade.length, colour);
    if (this.energy) dresser.attach("sword", this.energy.glow);
    dresser.finish(this.rig);
  }

  get root(): THREE.Group {
    return this.rig.root;
  }

  flash(colour: THREE.Color, amount: number): void {
    this.kit.flash(colour, amount);
  }

  dispose(): void {
    disposeOwned(this.rig.root);
    this.kit.dispose();
  }
}
