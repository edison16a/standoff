import * as THREE from "three";
import type { MatchEvent } from "../../engine/events";
import type { AthleteView, MatchView } from "../../engine/view";
import { BUILDS } from "../../builds";
import { TEAMS } from "../../teams";
import type { AthleteMaterials } from "../body/materials";
import { AthleteFigure } from "./athlete-figure";
import { figureOf } from "./figure-spec";
import { ChargeSprite } from "./charge-bar";
import { Contacts } from "./contacts";
import { KeeperFigure } from "./keeper-figure";
import { Marker } from "./markers";
import { NameTag } from "./tag";
import { BAR_UP, TagStack } from "./tag-stack";


export interface Label {
  name: string;
  colour: string;
  /** A phone's player: bright tag and a ring on the turf. */
  human: boolean;
  /** The name printed on the back of the shirt, for a phone's player. Computer players have just a number. */
  shirt?: string;
  /** A short word after the name on the tag, such as the build or Away. */
  detail?: string;
}

/**
 * Everyone on the pitch: the six outfield players with their tags and
 * rings, and the two keepers. The line up is rebuilt only when a new
 * match brings different players or kits.
 */
export class Squad {
  readonly group = new THREE.Group();
  private athletes: AthleteFigure[] = [];
  private keepers: KeeperFigure[] = [];
  private tags: (NameTag | null)[] = [];
  private markers: (Marker | null)[] = [];
  private blobs: THREE.Mesh[] = [];
  private bars: ChargeSprite[] = [];
  private readonly contacts = new Contacts();
  private readonly stack = new TagStack();
  private lineup = "";
  private labels = "";
  private label: ((id: number) => Label) | null = null;
  private readonly blobMaterial: THREE.MeshBasicMaterial;
  private readonly blobGeometry = new THREE.PlaneGeometry(1, 1);

  constructor(glow: THREE.Texture, private readonly mats: AthleteMaterials) {
    this.blobMaterial = new THREE.MeshBasicMaterial({ map: glow, color: "#000000", transparent: true, opacity: 0.45, depthWrite: false });
    this.keepers = [new KeeperFigure(0, mats), new KeeperFigure(1, mats)];
    for (const k of this.keepers) this.group.add(k.rig.root);
  }

  setLabels(label: (id: number) => Label): void {
    this.label = label;
    this.labels = "";
  }

  update(view: MatchView, dt: number, time: number, tags: boolean): void {
    // A phone's player wears their own name on the back, so a new name is a new shirt.
    const lineup = view.athletes.map((a) => `${a.build}/${a.team}/${this.shirtName(a)}`).join(",");
    if (lineup !== this.lineup) this.rebuild(view, lineup);
    this.refreshLabels(view);
    view.athletes.forEach((a, i) => {
      const figure = this.athletes[i]!;
      figure.update(a, view.ball, dt, time);
      const blob = this.blobs[i]!;
      blob.position.set(a.x, 0.015, a.z);
      const tag = this.tags[i];
      if (tag) {
        tag.sprite.visible = tags;
        tag.sprite.position.set(a.x, figure.spec.look.height + 0.34, a.z);
      }
      this.markers[i]?.update(a, time);
      const bar = this.bars[i]!;
      bar.set(a.bar ? a.charge : null);
      bar.sprite.position.set(a.x, figure.spec.look.height + 0.34, a.z);
    });
    view.keepers.forEach((k, i) => this.keepers[i]!.update(k, dt, time));
    this.contacts.update(view, this.athletes, dt);
  }

  /** Tackles, fouls and the ball hitting a body rock the players involved. */
  onEvent(event: MatchEvent, view: MatchView): void {
    this.contacts.onEvent(event, view, this.athletes);
  }

  /** Where a player's hands are in the world, for the cup in the captain's grip. False if there is no such player. */
  hands(id: number, left: THREE.Vector3, right: THREE.Vector3): boolean {
    const figure = this.athletes[id];
    if (!figure) return false;
    figure.rig.handL.getWorldPosition(left);
    figure.rig.handR.getWorldPosition(right);
    return true;
  }

  /** Sizes the tags for the lens, and draws each body in its fine cut when it is big on screen, its light one otherwise. */
  fitView(camera: THREE.PerspectiveCamera, pixels: number, allowFine: boolean): void {
    for (const tag of this.tags) tag?.fit(camera.fov);
    for (const bar of this.bars) bar.fit(camera.fov);
    for (const f of this.athletes) f.lod.fit(camera, pixels, allowFine);
    for (const k of this.keepers) k.lod.fit(camera, pixels, allowFine);
  }

  /** Lifts tags clear of each other (tag-stack.ts). */
  stackTags(camera: THREE.PerspectiveCamera, dt: number): void {
    this.stack.apply(camera, dt, this.tags, this.bars);
  }

  private rebuild(view: MatchView, lineup: string): void {
    this.clearAthletes();
    this.lineup = lineup;
    for (const a of view.athletes) {
      const figure = new AthleteFigure(a, TEAMS[a.team].kit, this.mats, figureOf(a.build, this.shirtName(a)));
      this.athletes.push(figure);
      this.group.add(figure.rig.root);
      // A soft contact shadow grounds each player even where the shadow map is thin.
      const blob = new THREE.Mesh(this.blobGeometry, this.blobMaterial);
      blob.rotation.x = -Math.PI / 2;
      blob.scale.setScalar(1.3);
      blob.renderOrder = 1;
      this.blobs.push(blob);
      this.group.add(blob);
      // The charge bar sits above the name tag, anchored at the same spot.
      const bar = new ChargeSprite();
      bar.sprite.center.set(0.5, -BAR_UP);
      this.bars.push(bar);
      this.group.add(bar.sprite);
    }
    this.labels = "";
  }

  /** Tags and rings follow who is playing each figure: a phone's player, or a computer. */
  private refreshLabels(view: MatchView): void {
    const labels = view.athletes.map((a) => {
      const l = this.labelOf(a);
      return `${l.name}|${l.colour}|${l.human}|${l.detail ?? ""}`;
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
      const l = this.labelOf(a);
      const tag = new NameTag(l.name, l.colour, l.human, l.detail);
      this.tags.push(tag);
      this.group.add(tag.sprite);
      const marker = l.human ? new Marker(l.colour) : null;
      this.markers.push(marker);
      if (marker) this.group.add(marker.group);
    }
  }

  /** The tag over a player: the session's, or with none (the showcase) the build's name. */
  private labelOf(a: AthleteView): Label {
    return this.label?.(a.id) ?? { name: BUILDS[a.build].name, colour: TEAMS[a.team].color, human: false };
  }

  /** A phone's player has their own name printed on the shirt; a computer player has just the number. */
  private shirtName(a: AthleteView): string {
    return this.labelOf(a).shirt ?? "";
  }

  private clearAthletes(): void {
    for (const figure of this.athletes) {
      this.group.remove(figure.rig.root);
      figure.dispose();
    }
    for (const blob of this.blobs) this.group.remove(blob);
    for (const bar of this.bars) {
      this.group.remove(bar.sprite);
      bar.dispose();
    }
    this.athletes = [];
    this.blobs = [];
    this.bars = [];
  }

  dispose(): void {
    this.clearAthletes();
    for (const k of this.keepers) k.dispose();
    for (const tag of this.tags) tag?.dispose();
    for (const marker of this.markers) marker?.dispose();
    this.blobMaterial.dispose();
    this.blobGeometry.dispose();
  }
}
