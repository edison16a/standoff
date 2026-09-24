import * as THREE from "three";
import type { GameEvent } from "@/games/fencing/engine/events";
import { STRIP_HALF_LENGTH } from "@/games/fencing/engine/rules";
import { Arena } from "./arena";
import { Bunting } from "./bunting";
import type { HallTheme } from "./hall-theme";
import { Lighting } from "./lighting";
import { Piste, PODIUM_TOP } from "./piste";
import { RefereeView } from "./referee-view";
import { Scoring } from "./scoring";
import { Stands } from "./stands";

export interface HallQuality {
  shadows: boolean;
  shadowSize: number;
  crowd: boolean;
}

/**
 * The fencing hall: the room, the podium and strip, the scoring machine
 * and its repeater lamps, the referee, the crowd in the stands, bunting
 * and the lights. It reacts to the bout: lamps and podium light up on a
 * touch, the referee signals it, and the crowd jumps.
 */
export class Hall {
  readonly group = new THREE.Group();
  /** The fencers stand on the podium, so their group sits this high. */
  readonly floor = PODIUM_TOP;
  readonly lighting: Lighting;
  private readonly arena: Arena;
  private readonly piste: Piste;
  private readonly scoring: Scoring;
  private readonly referee: RefereeView;
  private readonly stands: Stands | null;
  private readonly bunting: Bunting;

  constructor(readonly theme: HallTheme, quality: HallQuality) {
    this.arena = new Arena(theme);
    this.piste = new Piste(theme);
    this.scoring = new Scoring(STRIP_HALF_LENGTH + 1.1);
    this.scoring.group.position.z = -3.5;
    this.referee = new RefereeView();
    this.stands = quality.crowd ? new Stands(theme) : null;
    this.bunting = new Bunting();
    this.lighting = new Lighting(theme, quality);
    this.group.add(this.arena.group, this.piste.group, this.scoring.group, this.referee.group, this.bunting.group, this.lighting.group);
    if (this.stands) this.group.add(this.stands.group);
  }

  setScores(left: number, right: number): void {
    this.scoring.setScores(left, right);
  }

  /** The hall's part in each moment of the bout. `contact` is where a touch landed. */
  react(event: GameEvent, wallNow: number, contact: THREE.Vector3 | null): void {
    switch (event.type) {
      case "touch":
        this.scoring.light(event.scorer);
        this.piste.flash(event.scorer);
        this.referee.point(event.scorer, wallNow);
        if (contact) this.lighting.burst(contact, 0.6);
        break;
      case "impact":
        this.stands?.roar(wallNow, event.scorer, 1);
        if (contact) this.lighting.burst(contact, 1.2);
        break;
      case "parried":
        if (event.clash) this.stands?.roar(wallNow, null, 0.55);
        if (contact) this.lighting.burst(contact, 0.35);
        break;
      case "matchWon":
        this.stands?.roar(wallNow, event.winner, 1.4);
        break;
    }
  }

  /** `focusX` is the middle of the action, which the follow spot and the referee track. */
  update(wallNow: number, dtMs: number, focusX: number): void {
    this.arena.update(wallNow);
    this.piste.update(dtMs, this.theme.boardGlow);
    this.scoring.update(dtMs);
    this.referee.update(wallNow, focusX);
    this.stands?.update(wallNow);
    this.bunting.update(wallNow);
    this.lighting.follow(focusX);
    this.lighting.update(dtMs);
  }

  dispose(): void {
    this.arena.dispose();
    this.piste.dispose();
    this.scoring.dispose();
    this.referee.dispose();
    this.stands?.dispose();
    this.bunting.dispose();
    this.lighting.dispose();
  }
}
