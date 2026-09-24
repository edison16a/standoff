import type { CharacterId } from "@/shared/characters";
import type { Tone } from "../brush";

export type HeadKind = "mesh-mask" | "plumed-hat" | "bandana" | "helm";
export type TorsoKind = "jacket" | "doublet" | "long-coat" | "plate";
export type BladeKind = "epee" | "rapier" | "saber" | "arming";

/**
 * A character's look: which art piece goes on each bone and what tone it
 * is painted in. Swapping skins never touches the skeleton or the
 * animation, which is why every character stays fully reactive.
 */
export interface Skin {
  id: CharacterId;
  head: HeadKind;
  torso: TorsoKind;
  blade: BladeKind;
  /** Blade length in metres. The referee's reach does not change with it. */
  bladeLength: number;
  /**
   * Body proportions: arm and leg radius at the root in metres, and a chest
   * scale. This is the only thing that makes Iron look heavier than Vale.
   */
  build: { arm: number; leg: number; chest: number };
  tones: {
    body: Tone;
    sleeve: Tone;
    glove: Tone;
    legs: Tone;
    socks: Tone;
    shoes: Tone;
    head: Tone;
    headDetail: Tone;
    blade: Tone;
    guard: Tone;
  };
}
