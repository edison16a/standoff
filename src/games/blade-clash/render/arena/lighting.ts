import * as THREE from "three";
import type { ArenaTheme } from "./arena-theme";

/**
 * The arena's lights. By day the sun does the work and casts the
 * fighters' shadows across the dais. By night a hard spotlight hangs over
 * the dais and casts them instead, the moon is a faint cool fill, and the
 * braziers' fire flickers warm on everything near. A short white flash
 * marks the moment blades meet or land.
 */
export class Lighting {
  readonly group = new THREE.Group();
  private readonly fires: THREE.PointLight[] = [];
  private readonly flash = new THREE.PointLight(0xfff2d0, 0, 9, 2);
  private readonly caster: THREE.DirectionalLight | THREE.SpotLight;
  private readonly fireLevel: number;
  private flashLevel = 0;

  constructor(theme: ArenaTheme, from: THREE.Vector3, quality: { shadows: boolean; shadowSize: number }) {
    this.group.add(new THREE.HemisphereLight(theme.hemisphere.sky, theme.hemisphere.ground, theme.hemisphere.intensity));
    const sun = new THREE.DirectionalLight(theme.sun.color, theme.sun.intensity);
    sun.position.copy(from).setLength(30);
    this.group.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(theme.rim.color, theme.rim.intensity);
    rim.position.set(0, 6, -12);
    this.group.add(rim);

    if (theme.dark) {
      const key = new THREE.SpotLight(theme.key.color, theme.key.intensity, 40, 0.5, 0.55, 1.5);
      key.position.set(1.5, 14, 2.5);
      key.target.position.set(0, 0, 0);
      this.group.add(key, key.target);
      this.caster = key;
    } else {
      this.caster = sun;
      const box = sun.shadow.camera;
      box.left = -10;
      box.right = 10;
      box.top = 7;
      box.bottom = -7;
      box.near = 5;
      box.far = 60;
    }
    this.caster.castShadow = quality.shadows;
    this.caster.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    this.caster.shadow.bias = -0.0004;
    this.caster.shadow.normalBias = 0.03;

    // Firelight from each end of the dais, where the braziers burn.
    for (const x of [-8.2, 8.2]) {
      const fire = new THREE.PointLight(0xff8a3a, 0, 14, 1.6);
      fire.position.set(x, 2, 0);
      this.fires.push(fire);
      this.group.add(fire);
    }
    this.fireLevel = theme.fire;
    this.group.add(this.flash);
  }

  /** A white flash from the point of contact. */
  burst(at: THREE.Vector3, strength = 1): void {
    this.flash.position.copy(at).add(new THREE.Vector3(0, 0.3, 0));
    this.flashLevel = strength;
  }

  update(t: number, dtMs: number): void {
    this.flashLevel *= Math.exp(-dtMs / 160);
    this.flash.intensity = this.flashLevel * 6;
    this.fires.forEach((fire, i) => {
      const flicker = 0.82 + 0.1 * Math.sin(t / 73 + i * 2) + 0.08 * Math.sin(t / 31 + i * 5);
      fire.intensity = this.fireLevel * 9 * flicker;
    });
  }

  dispose(): void {
    this.caster.shadow.map?.dispose();
    for (const light of this.group.children) if (light instanceof THREE.Light) light.dispose();
  }
}
