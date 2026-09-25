import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import { ROSTER } from "../../roster";
import { TEAMS } from "../../teams";
import { AthleteFigure } from "./athlete-figure";
import { KeeperFigure } from "./keeper-figure";
import { Marker } from "./markers";
import { NameTag } from "./tag";

export interface Label {
  name: string;
  colour: string;
  /** A phone's player: bright tag and a ring on the turf. */
  human: boolean;
}

/**
 * Everyone on the pitch: the six outfield players with their tags and
 * rings, and the two keepers. The line up is rebuilt only when a new
 * match brings different players or kits.
 */
export class Squad {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02 });
  private athletes: AthleteFigure[] = [];
  private keepers: KeeperFigure[] = [];
  private tags: (NameTag | null)[] = [];
  private markers: (Marker | null)[] = [];
  private blobs: THREE.Mesh[] = [];
  private lineup = "";
  private labels = "";
  private label: ((id: number) => Label) | null = null;
  private readonly blobMaterial: THREE.MeshBasicMaterial;
  private readonly blobGeometry = new THREE.PlaneGeometry(1, 1);

  constructor(glow: THREE.Texture) {
    this.blobMaterial = new THREE.MeshBasicMaterial({ map: glow, color: "#000000", transparent: true, opacity: 0.45, depthWrite: false });
    this.keepers = [new KeeperFigure(0, this.material), new KeeperFigure(1, this.material)];
    for (const k of this.keepers) this.group.add(k.rig.root);
  }

  setLabels(label: (id: number) => Label): void {
    this.label = label;
    this.labels = "";
  }

  update(view: MatchView, dt: number, time: number, tags: boolean): void {
    const lineup = view.athletes.map((a) => `${a.character}/${a.team}`).join(",");
    if (lineup !== this.lineup) this.rebuild(view, lineup);
    this.refreshLabels(view);
    view.athletes.forEach((a, i) => {
      const figure = this.athletes[i]!;
      figure.update(a, dt, time);
      const blob = this.blobs[i]!;
      blob.position.set(a.x, 0.015, a.z);
      const tag = this.tags[i];
      if (tag) {
        tag.sprite.visible = tags;
        tag.sprite.position.set(a.x, figure.character.look.height + 0.34, a.z);
      }
      this.markers[i]?.update(a, time);
    });
    view.keepers.forEach((k, i) => this.keepers[i]!.update(k, dt, time));
  }

  fitTags(fov: number): void {
    for (const tag of this.tags) tag?.fit(fov);
  }

  private rebuild(view: MatchView, lineup: string): void {
    this.clearAthletes();
    this.lineup = lineup;
    for (const a of view.athletes) {
      const figure = new AthleteFigure(a, TEAMS[a.team].kit, this.material);
      this.athletes.push(figure);
      this.group.add(figure.rig.root);
      // A soft contact shadow grounds each player even where the shadow map is thin.
      const blob = new THREE.Mesh(this.blobGeometry, this.blobMaterial);
      blob.rotation.x = -Math.PI / 2;
      blob.scale.setScalar(1.3);
      blob.renderOrder = 1;
      this.blobs.push(blob);
      this.group.add(blob);
    }
    this.labels = "";
  }

  /** Tags and rings follow who is playing each figure: a phone's player, or a computer. */
  private refreshLabels(view: MatchView): void {
    const labels = view.athletes.map((a) => {
      const l = this.label?.(a.id) ?? { name: ROSTER[a.character].short, colour: TEAMS[a.team].color, human: false };
      return `${l.name}|${l.colour}|${l.human}`;
    });
    const key = labels.join(",");
    if (key === this.labels) return;
    this.labels = key;
    for (const tag of this.tags) {
      if (!tag) continue;
      this.group.remove(tag.sprite);
      tag.dispose();
    }
    for (const marker of this.markers) {
      if (!marker) continue;
      this.group.remove(marker.group);
      marker.dispose();
    }
    this.tags = [];
    this.markers = [];
    for (const a of view.athletes) {
      const l = this.label?.(a.id) ?? { name: ROSTER[a.character].short, colour: TEAMS[a.team].color, human: false };
      const tag = new NameTag(l.name, l.colour, l.human);
      this.tags.push(tag);
      this.group.add(tag.sprite);
      const marker = l.human ? new Marker(l.colour) : null;
      this.markers.push(marker);
      if (marker) this.group.add(marker.group);
    }
  }

  private clearAthletes(): void {
    for (const figure of this.athletes) {
      this.group.remove(figure.rig.root);
      figure.dispose();
    }
    for (const blob of this.blobs) this.group.remove(blob);
    this.athletes = [];
    this.blobs = [];
  }

  dispose(): void {
    this.clearAthletes();
    for (const k of this.keepers) k.dispose();
    for (const tag of this.tags) tag?.dispose();
    for (const marker of this.markers) marker?.dispose();
    this.material.dispose();
    this.blobMaterial.dispose();
    this.blobGeometry.dispose();
  }
}
