import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import type { ArenaTheme } from "./arena-theme";
import { sandTexture } from "./arena-textures";
import { Dais, FLOOR } from "./dais";
import { Decor } from "./decor";
import { Flames } from "./fire";
import { Gates } from "./gates";
import { Lighting } from "./lighting";
import { Sky } from "./sky";
import { Stands, STANDS } from "./stands";

export interface ArenaQuality {
  shadows: boolean;
  shadowSize: number;
  crowd: boolean;
}

/**
 * The duelling arena: a stone dais on raked sand in the middle of a round
 * open air arena, a full house on the tiers all round, a great gate at
 * each end of the fighting line, braziers, torches and banners, under a
 * summer sky or the stars. It reacts to the fight: light flares where
 * blades meet or land, the hitter's lamps glow and the crowd jumps.
 */
export class Arena {
  readonly group = new THREE.Group();
  /** The fighters stand on the dais, so their group sits this high. */
  readonly floor = FLOOR;
  private readonly sky: Sky;
  private readonly dais: Dais;
  private readonly stands: Stands;
  private readonly gates: Gates;
  private readonly decor: Decor;
  private readonly flames: Flames;
  private readonly lighting: Lighting;
  private readonly ground: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;

  constructor(readonly theme: ArenaTheme, quality: ArenaQuality) {
    this.sky = new Sky(theme);
    this.dais = new Dais(theme);
    this.stands = new Stands(theme, quality.crowd);
    this.gates = new Gates(theme);
    this.decor = new Decor(theme);
    this.flames = new Flames([...this.decor.flames, ...this.gates.flames], theme.fire);
    this.lighting = new Lighting(theme, this.sky.lightFrom, quality);
    const sand = sandTexture(theme.sand).clone();
    sand.repeat.set(10, 10);
    sand.needsUpdate = true;
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(STANDS.radius + 0.1, 64), new THREE.MeshStandardMaterial({ map: sand, roughness: 0.95 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.group.add(this.sky.group, this.ground, this.dais.group, this.stands.group, this.gates.group, this.decor.group, this.flames.mesh, this.lighting.group);
  }

  /** The arena's part in each moment of the fight. */
  react(event: GameEvent, wallNow: number): void {
    switch (event.type) {
      case "hit": {
        const at = new THREE.Vector3(event.at.x, event.at.y + this.floor, event.at.z);
        this.dais.flash(event.attacker);
        this.lighting.burst(at, event.final ? 1.2 : 0.6);
        this.stands.roar(wallNow, event.attacker, event.final ? 1.2 : 0.6);
        break;
      }
      case "clash": {
        const at = new THREE.Vector3(event.at.x, event.at.y + this.floor, event.at.z);
        this.lighting.burst(at, 0.4 + event.strength * 0.8);
        if (event.strength > 0.6) this.stands.roar(wallNow, null, 0.5);
        break;
      }
      case "matchWon":
        this.stands.roar(wallNow, event.winner, 1.4);
        break;
    }
  }

  update(wallNow: number, dtMs: number): void {
    this.sky.update(wallNow);
    this.dais.update(dtMs);
    this.stands.update(wallNow);
    this.gates.update(wallNow);
    this.flames.update(wallNow);
    this.lighting.update(wallNow, dtMs);
  }

  dispose(): void {
    this.sky.dispose();
    this.dais.dispose();
    this.stands.dispose();
    this.gates.dispose();
    this.decor.dispose();
    this.flames.dispose();
    this.lighting.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
  }
}
