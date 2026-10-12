import type { WeaponId } from "../../engine/weapons";

/**
 * How each gun's muzzle flash looks. Real flashes differ a lot: the
 * AR's bird cage flash hider splits the flame into thin petals through
 * its slots, the AK's plain muzzle brake lets out a bigger bloom, the
 * shotgun throws a ball of orange flame from all that powder, and the
 * SMG's pistol cartridge barely flickers. Sizes are in metres.
 */
export interface FlashStyle {
  /** The star shaped core seen down the barrel. */
  core: number;
  /** A round fireball around the core, 0 for none. */
  ball: number;
  /** The tongue of flame straight out of the bore, and its width. */
  tongue: number;
  tongueWidth: number;
  /** Side petals: how many, how long (range) and how wide at the base. */
  petals: number;
  petalLength: readonly [number, number];
  petalWidth: number;
  /** How far the petals lean forward from square to the barrel, 0 to 1. */
  petalLean: number;
  /** Slots the flame can leave by. A bird cage is closed underneath, so no petal points down. */
  closedBelow: boolean;
  /** The hot inner colour and the cooler outer one. */
  hot: number;
  outer: number;
  /** Peak of the brief point light. */
  light: number;
  /** The overpressure ring's final size, 0 for none. */
  blast: number;
  /** Muzzle smoke puffs per shot. */
  smoke: number;
}

export const FLASH_STYLES: Record<WeaponId, FlashStyle> = {
  rifle: {
    core: 0.1, ball: 0, tongue: 0.1, tongueWidth: 0.03,
    petals: 5, petalLength: [0.09, 0.16], petalWidth: 0.035, petalLean: 0.2, closedBelow: true,
    hot: 0xfff2c8, outer: 0xffa040, light: 26, blast: 0, smoke: 2,
  },
  ak47: {
    core: 0.2, ball: 0.14, tongue: 0.26, tongueWidth: 0.1,
    petals: 6, petalLength: [0.12, 0.24], petalWidth: 0.07, petalLean: 0.35, closedBelow: false,
    hot: 0xffe8b0, outer: 0xff8a2a, light: 42, blast: 0.7, smoke: 4,
  },
  shotgun: {
    core: 0.24, ball: 0.42, tongue: 0.34, tongueWidth: 0.2,
    petals: 3, petalLength: [0.08, 0.14], petalWidth: 0.09, petalLean: 0.5, closedBelow: false,
    hot: 0xffd890, outer: 0xff6a18, light: 55, blast: 0.95, smoke: 6,
  },
  smg: {
    core: 0.075, ball: 0, tongue: 0.07, tongueWidth: 0.03,
    petals: 3, petalLength: [0.04, 0.08], petalWidth: 0.03, petalLean: 0.3, closedBelow: false,
    hot: 0xfff0c0, outer: 0xffa848, light: 16, blast: 0, smoke: 1,
  },
};
