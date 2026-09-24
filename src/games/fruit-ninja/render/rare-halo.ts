import { AdditiveBlending, Color, Group, NormalBlending, Sprite, SpriteMaterial } from "three";
import { glowTexture, raysTexture } from "./textures/sprites";

/**
 * The glow around a rare fruit: a soft coloured haze that shows up even
 * on pale wood, and slowly turning rays of light on top, so a rare fruit
 * is spotted the moment it rises.
 */
export class RareHalo {
  readonly group = new Group();
  private readonly haze: Sprite;
  private readonly rays: Sprite;

  constructor(
    colour: string,
    private readonly rainbow: boolean,
  ) {
    this.haze = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(colour), blending: NormalBlending, transparent: true, opacity: 0.45, depthWrite: false }));
    this.haze.scale.setScalar(3.6);
    this.rays = new Sprite(new SpriteMaterial({ map: raysTexture(), color: new Color(colour), blending: AdditiveBlending, transparent: true, depthWrite: false }));
    this.rays.scale.setScalar(5.2);
    this.group.add(this.haze, this.rays);
  }

  update(time: number, seed: number): void {
    this.rays.material.rotation = time * 0.7 + seed;
    this.rays.material.opacity = 0.65 + 0.25 * Math.sin(time * 5 + seed);
    this.haze.material.opacity = 0.35 + 0.12 * Math.sin(time * 3 + seed);
    if (this.rainbow) {
      this.rays.material.color.setHSL((time * 0.35) % 1, 1, 0.6);
      this.haze.material.color.setHSL((time * 0.35 + 0.5) % 1, 1, 0.65);
    }
  }

  dispose(): void {
    this.haze.material.dispose();
    this.rays.material.dispose();
  }
}
