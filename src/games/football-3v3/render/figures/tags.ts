import * as THREE from "three";
import type { MatchView } from "../../engine/view";
import { NameTag } from "./name-tag";
import type { Squad } from "./squad";

/** What a tag says and its colour, or null for no tag. */
export type TagOf = (id: number) => { name: string; colour: string } | null;

const at = new THREE.Vector3();

/**
 * The name tags over the players people control, so everyone can find
 * themselves on a busy field. A tag is drawn once per name and colour and
 * reused; players without one (the computer's) show nothing.
 */
export class NameTags {
  readonly group = new THREE.Group();
  private readonly tags = new Map<number, { key: string; tag: NameTag }>();

  update(view: MatchView, tagOf: TagOf | null, squad: Squad, fov: number): void {
    const seen = new Set<number>();
    if (tagOf && view.phase !== "over") {
      for (const a of view.athletes) {
        const want = tagOf(a.id);
        const figure = squad.figure(a.id);
        if (!want || !figure) continue;
        const key = `${want.name}|${want.colour}`;
        let entry = this.tags.get(a.id);
        if (entry?.key !== key) {
          if (entry) this.drop(a.id);
          entry = { key, tag: new NameTag(want.name, want.colour) };
          this.tags.set(a.id, entry);
          this.group.add(entry.tag.sprite);
        }
        figure.top(at);
        entry.tag.sprite.position.copy(at);
        entry.tag.fit(fov);
        seen.add(a.id);
      }
    }
    for (const id of [...this.tags.keys()]) if (!seen.has(id)) this.drop(id);
  }

  private drop(id: number): void {
    const entry = this.tags.get(id);
    if (!entry) return;
    entry.tag.sprite.removeFromParent();
    entry.tag.dispose();
    this.tags.delete(id);
  }

  dispose(): void {
    for (const id of [...this.tags.keys()]) this.drop(id);
  }
}
