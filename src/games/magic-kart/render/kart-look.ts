import type * as THREE from "three";
import { loadFrameRate } from "@/platform/frame-rate/frame-rate-settings";
import { bakeKartEnvironment, studioFor } from "./kart-env";
import type { KartView } from "./kart-view";
import { QualityGovernor } from "./quality";
import type { Theme } from "./themes";

/**
 * How the karts look on the current map and machine: what their paint
 * reflects (the map's own sky, baked once per map), how bright their
 * lamps burn, and how much detail this machine can afford.
 */
export class KartLook {
  readonly quality = new QualityGovernor(() => loadFrameRate().cap);
  private environment: THREE.Texture | null = null;
  private night = false;

  /** A new map: bake its reflections. */
  setMap(renderer: THREE.WebGLRenderer, theme: Theme): void {
    this.environment?.dispose();
    this.environment = bakeKartEnvironment(renderer, studioFor(theme));
    this.night = theme.reflections >= 0.7;
  }

  /** Dresses one kart for the map and the current quality. */
  dress(view: KartView): void {
    const level = this.quality.current;
    view.model.setEnvironment(this.environment, 1);
    // Headlamps burn brighter on the night maps.
    view.model.setHeadlamps(this.night ? 1.8 : 1);
    view.model.setClearcoat(level.clearcoat);
    view.farSwitch = level.farSwitch;
  }

  dispose(): void {
    this.environment?.dispose();
  }
}
