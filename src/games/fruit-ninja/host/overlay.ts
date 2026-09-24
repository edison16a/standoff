import { playerColor } from "@/games/kit/players";
import type { MatchEvent, Seat } from "../engine/events";
import { HALF_HEIGHT } from "../engine/tuning";
import type { BladeFrame } from "../render/trails";

type ScoreEvent = Extract<MatchEvent, { type: "score" }>;

/** Longest a popup stays, matching its CSS animation. */
const POPUP_MS = 1300;

/**
 * Text drawn over the canvas: points rising from each cut, combo and
 * bomb callouts, and each player's name riding next to their blade. It
 * is plain DOM, moved by hand every frame, so React never re-renders
 * for it.
 */
export class Overlay {
  private readonly labels = new Map<Seat, HTMLElement>();

  constructor(
    private readonly root: HTMLElement,
    private readonly halfWidth: () => number,
  ) {}

  /** A world point in CSS pixels inside the overlay. */
  private toPixels(x: number, y: number): { left: number; top: number } {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    return { left: ((x / this.halfWidth() + 1) / 2) * w, top: ((1 - y / HALF_HEIGHT) / 2) * h };
  }

  score(event: ScoreEvent): void {
    const colour = playerColor(event.seat);
    const sign = event.delta > 0 ? "+" : event.delta < 0 ? "−" : "";
    const points = event.delta !== 0 ? `${sign}${Math.abs(event.delta)}` : "";
    switch (event.reason) {
      case "fruit":
      case "hit":
        return this.popup(points, "", event.at, colour, "small");
      case "burst":
        return this.popup(points, "Smashed", event.at, colour, "big");
      case "rare":
        return this.popup(points, "Rare fruit", event.at, "#ffd23a", "big");
      case "bomb":
        return this.popup(points || "Boom", points ? "Bomb" : "", event.at, "#ff3b30", "big");
      case "combo":
        return this.popup(`${event.count ?? 3} fruit combo`, points, event.at, colour, "combo");
    }
  }

  private popup(text: string, sub: string, at: { x: number; y: number }, colour: string, size: "small" | "big" | "combo"): void {
    if (!text) return;
    const el = document.createElement("div");
    el.className = `fn-pop fn-pop--${size}`;
    el.style.setProperty("--pop", colour);
    const { left, top } = this.toPixels(at.x, at.y);
    // Keep callouts on screen when the cut happens near an edge.
    el.style.left = `${Math.max(90, Math.min(this.root.clientWidth - 90, left))}px`;
    el.style.top = `${Math.max(60, Math.min(this.root.clientHeight - 40, top))}px`;
    el.textContent = text;
    if (sub) {
      const small = document.createElement("span");
      small.className = "fn-pop__sub";
      small.textContent = sub;
      el.appendChild(small);
    }
    this.root.appendChild(el);
    setTimeout(() => el.remove(), POPUP_MS);
  }

  /** Moves each player's name tag to sit beside their blade tip. */
  tags(blades: readonly BladeFrame[], names: (seat: Seat) => string): void {
    const seen = new Set<Seat>();
    for (const blade of blades) {
      seen.add(blade.seat);
      let tag = this.labels.get(blade.seat);
      if (!tag) {
        tag = document.createElement("div");
        tag.className = "fn-tag";
        tag.style.setProperty("--pop", blade.color);
        this.root.appendChild(tag);
        this.labels.set(blade.seat, tag);
      }
      const name = names(blade.seat);
      if (tag.textContent !== name) tag.textContent = name;
      tag.classList.toggle("fn-tag--stunned", blade.stunned);
      const { left, top } = this.toPixels(blade.x, blade.y);
      tag.style.transform = `translate(${left + 18}px, ${top - 34}px)`;
    }
    for (const [seat, tag] of this.labels) {
      if (seen.has(seat)) continue;
      tag.remove();
      this.labels.delete(seat);
    }
  }

  dispose(): void {
    for (const tag of this.labels.values()) tag.remove();
    this.labels.clear();
  }
}
