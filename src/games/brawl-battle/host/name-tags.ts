import * as THREE from "three";
import type { MatchState } from "../engine/types";
import type { BrawlRenderer } from "../render/brawl-renderer";

/**
 * Player names floating over the fighters, as plain HTML over the
 * canvas so the text stays sharp. Computer fighters get a small CPU tag.
 * Positions are written straight to the elements every frame; React
 * never sees them.
 */
export class NameTags {
  private readonly tags: HTMLElement[] = [];
  private readonly point = new THREE.Vector3();
  private shown: MatchState | null = null;

  constructor(private readonly layer: HTMLElement) {}

  update(m: MatchState, r: BrawlRenderer, nameOf: (id: number) => string, width: number, height: number): void {
    if (m !== this.shown) this.build(m, r, nameOf);
    m.fighters.forEach((f, i) => {
      const tag = this.tags[i]!;
      const head = f.action === "out" || f.action === "dead" ? null : r.headPoint(f.id, this.point);
      const at = head ? r.project(head, width, height) : null;
      if (!at) {
        tag.style.opacity = "0";
        return;
      }
      tag.style.opacity = "1";
      tag.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  }

  hide(): void {
    for (const tag of this.tags) tag.style.opacity = "0";
  }

  private build(m: MatchState, r: BrawlRenderer, nameOf: (id: number) => string): void {
    this.dispose();
    this.shown = m;
    for (const f of m.fighters) {
      const tag = document.createElement("span");
      tag.className = `bb-tag ${f.seat === null ? "bb-tag--bot" : ""}`;
      tag.style.setProperty("--tag", r.colours[f.id]?.colour ?? "#ffffff");
      tag.textContent = f.seat === null ? "CPU" : nameOf(f.id);
      this.layer.appendChild(tag);
      this.tags.push(tag);
    }
  }

  dispose(): void {
    for (const tag of this.tags) tag.remove();
    this.tags.length = 0;
    this.shown = null;
  }
}
