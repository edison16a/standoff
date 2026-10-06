import * as THREE from "three";
import type { ChargeSprite } from "./charge-bar";
import type { NameTag } from "./tag";
import { stackTags, type TagBox } from "./tag-layout";

/** The charge bar sits this many of its own heights over the tag's anchor. */
export const BAR_UP = 3.6;

const at = new THREE.Vector3();

/**
 * Players bunched together would pile their tags on top of each other,
 * so a tag that would cover another climbs just above it, and the
 * charge bar over it climbs with it. Worked in half screen heights,
 * which is how the tags are sized. Each lift eases, so tags glide.
 */
export class TagStack {
  private lifts: number[] = [];

  apply(camera: THREE.PerspectiveCamera, dt: number, tags: readonly (NameTag | null)[], bars: readonly ChargeSprite[]): void {
    // The camera was just moved for this frame; drawing would only catch it up afterwards.
    camera.updateMatrixWorld();
    const f = camera.projectionMatrix.elements[5]!;
    const shown: { i: number; box: TagBox }[] = [];
    tags.forEach((tag, i) => {
      if (!tag?.sprite.visible) return;
      at.copy(tag.sprite.position).project(camera);
      if (at.z > 1) return;
      const size = tag.sprite.scale;
      const bar = bars[i];
      const barTop = bar?.sprite.visible ? (BAR_UP + 1) * bar.sprite.scale.y * f : 0;
      shown.push({ i, box: { x: at.x * camera.aspect, y: -at.y, w: size.x * f, h: Math.max(size.y * f, barTop) } });
    });
    const lifts = stackTags(shown.map((s) => s.box));
    const k = 1 - Math.exp(-dt * 18);
    shown.forEach(({ i }, n) => {
      const last = this.lifts[i] ?? 0;
      const lift = last + (lifts[n]! - last) * k;
      this.lifts[i] = lift;
      const tag = tags[i]!;
      tag.sprite.center.y = lift / (tag.sprite.scale.y * f);
      const bar = bars[i];
      if (bar) bar.sprite.center.y = -BAR_UP + lift / (bar.sprite.scale.y * f);
    });
  }
}
