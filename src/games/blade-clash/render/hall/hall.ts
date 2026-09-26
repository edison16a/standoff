import * as THREE from "three";
import type { GameEvent } from "@/games/blade-clash/engine/events";
import { Arena } from "./arena";
import { Bunting } from "./bunting";
import type { HallTheme } from "./hall-theme";
import { Lighting } from "./lighting";
import { Piste, PODIUM_TOP } from "./piste";
import { Stands } from "./stands";

export interface HallQuality {
  shadows: boolean;
  shadowSize: number;
  crowd: boolean;
}

/**
 * The duelling hall, for now: the room, a raised podium with the fighting
 * line, the crowd in the stands, bunting and the lights. It reacts to the
 * fight: the lights flare where blades meet or land, the hitter's half of
 * the podium lights up, and the crowd jumps.
 */
export class Hall {
  readonly group = new THREE.Group();
  /** The fighters stand on the podium, so their group sits this high. */
  readonly floor = PODIUM_TOP;
  readonly lighting: Lighting;
  private readonly arena: Arena;
  private readonly piste: Piste;
  private readonly stands: Stands | null;
  private readonly bunting: Bunting;

  constructor(readonly theme: HallTheme, quality: HallQuality) {
    this.arena = new Arena(theme);
    this.piste = new Piste(theme);
    this.stands = quality.crowd ? new Stands(theme) : null;
    this.bunting = new Bunting();
    this.lighting = new Lighting(theme, quality);
    this.group.add(this.arena.group, this.piste.group, this.bunting.group, this.lighting.group);
    if (this.stands) this.group.add(this.stands.group);
  }

  /** The hall's part in each moment of the fight. */
  react(event: GameEvent, wallNow: number): void {
    switch (event.type) {
      case "hit": {
        const at = new THREE.Vector3(event.at.x, event.at.y + this.floor, event.at.z);
        this.piste.flash(event.attacker);
        this.lighting.burst(at, event.final ? 1.2 : 0.6);
        this.stands?.roar(wallNow, event.attacker, event.final ? 1.2 : 0.6);
        break;
      }
      case "clash": {
        const at = new THREE.Vector3(event.at.x, event.at.y + this.floor, event.at.z);
        this.lighting.burst(at, 0.3 + event.strength * 0.5);
        if (event.strength > 0.6) this.stands?.roar(wallNow, null, 0.5);
        break;
      }
      case "matchWon":
        this.stands?.roar(wallNow, event.winner, 1.4);
        break;
    }
  }

  /** `focusX` is the middle of the action, which the follow spot tracks. */
  update(wallNow: number, dtMs: number, focusX: number): void {
    this.arena.update(wallNow);
    this.piste.update(dtMs, this.theme.boardGlow);
    this.stands?.update(wallNow);
    this.bunting.update(wallNow);
    this.lighting.follow(focusX);
    this.lighting.update(dtMs);
  }

  dispose(): void {
    this.arena.dispose();
    this.piste.dispose();
    this.stands?.dispose();
    this.bunting.dispose();
    this.lighting.dispose();
  }
}
