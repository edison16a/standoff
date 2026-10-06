import * as THREE from "three";
import { COUNTER_FROM, KEY_FROM } from "../field/light-rig";
import type { Tier } from "../quality/ladder";

/** Half the shadow box's width, metres: wide enough for a deep pass and its coverage. */
const REACH = 32;
/** How far up the light's line the shadow camera stands from the action. */
const DISTANCE = 110;
const KEY = 2.3;
const COUNTER = 1.25;
const SKY = 0.22;

const UP = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3();
const up = new THREE.Vector3();
const at = new THREE.Vector3();

/**
 * The stadium's light on the players. Two key lights stand in for the
 * floodlight banks over each sideline, each casting soft shadows, so a
 * player stands in the two faint crossed shadows of a night game. A sky
 * fill from above and a green bounce off the turf from below fill the
 * rest; the stadium's environment map (see stadium-env.ts) adds the
 * reflections and the soft light from every bank. The lights dim for the
 * trophy ceremony so its spotlights can take over.
 */
export class Floodlights {
  readonly group = new THREE.Group();
  private readonly key = new THREE.DirectionalLight("#fff3e2", KEY);
  private readonly counter = new THREE.DirectionalLight("#f4f6ff", COUNTER);
  private readonly fill = new THREE.HemisphereLight("#8fa2d8", "#2f5326", SKY);
  private level = 1;
  private want = 1;

  constructor(shadows: boolean) {
    for (const light of [this.key, this.counter]) {
      light.castShadow = shadows;
      const s = light.shadow;
      s.mapSize.set(2048, 2048);
      Object.assign(s.camera, { left: -REACH, right: REACH, top: REACH, bottom: -REACH, near: DISTANCE - 70, far: DISTANCE + 60 });
      s.bias = -0.0004;
      s.normalBias = 0.025;
      s.radius = 2.6;
      this.group.add(light, light.target);
    }
    this.group.add(this.fill);
  }

  /**
   * Follows the tier. The second set of shadows is switched off by not
   * redrawing its map and fading it out, never by removing it, so no
   * material has to rebuild its shader mid game.
   */
  setTier(tier: Tier): void {
    const second = tier.shadowLights === 2;
    this.counter.shadow.autoUpdate = second;
    this.counter.shadow.intensity = second ? 1 : 0;
    for (const light of [this.key, this.counter]) {
      const s = light.shadow;
      if (s.mapSize.x === tier.shadowMap) continue;
      s.mapSize.set(tier.shadowMap, tier.shadowMap);
      s.map?.dispose();
      s.map = null;
      // Redrawn once even when it no longer updates: a light left with no map makes three
      // bind a depth texture with no compare mode, and every lit draw then fails.
      s.needsUpdate = true;
    }
    // A coarser map wants a little more blur to hide its steps.
    this.key.shadow.radius = tier.shadowMap < 2048 ? 1.8 : 2.6;
    this.counter.shadow.radius = this.key.shadow.radius;
  }

  /** Centres both shadow boxes on the action, snapped to whole texels so the shadows never shimmer as it moves. */
  follow(x: number, z: number): void {
    for (const [light, from] of [[this.key, KEY_FROM], [this.counter, COUNTER_FROM]] as const) {
      const texel = (2 * REACH) / light.shadow.mapSize.x;
      right.crossVectors(UP, from).normalize();
      up.crossVectors(from, right);
      at.set(x, 0, z);
      const r = at.dot(right);
      const u = at.dot(up);
      at.addScaledVector(right, Math.round(r / texel) * texel - r).addScaledVector(up, Math.round(u / texel) * texel - u);
      light.target.position.copy(at);
      light.position.copy(at).addScaledVector(from, DISTANCE);
    }
  }

  /** 1 for a game, lower to let the ceremony's spotlights carry the scene. */
  dim(level: number): void {
    this.want = level;
  }

  update(dt: number): void {
    this.level += (this.want - this.level) * (1 - Math.exp(-dt * 1.5));
    this.key.intensity = KEY * this.level;
    this.counter.intensity = COUNTER * this.level;
    this.fill.intensity = SKY * (0.6 + 0.4 * this.level);
  }

  /** How bright the floods are now, 0 to 1, for the environment light to follow. */
  get brightness(): number {
    return this.level;
  }

  dispose(): void {
    this.key.dispose();
    this.counter.dispose();
    this.fill.dispose();
  }
}
