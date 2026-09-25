import * as THREE from "three";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import { greenHalfMs, GREEN_MS, type Grade } from "../engine/shot-model";
import { SHOT } from "../engine/tuning";
import { CHARACTERS } from "../roster";
import type { CourtRenderer } from "./court-renderer";

export interface TagLabel {
  name: string;
  /** The player's seat colour, or null for a computer player. */
  colour: string | null;
}

interface Tag {
  root: HTMLDivElement;
  name: HTMLSpanElement;
  meter: HTMLDivElement;
  fill: HTMLDivElement;
  green: HTMLDivElement;
  text: string;
  grade: Grade | null;
  gradeUntil: number;
}

const point = new THREE.Vector3();

/**
 * Name tags over every player, in their phone's colour, with a ball
 * marker on whoever has it. Over a shooter floats the same shot meter
 * their phone shows, so the room sees the release too. Plain DOM moved
 * each frame, which stays crisp at any screen size.
 */
export class Tags {
  private readonly tags: Tag[] = [];

  constructor(private readonly container: HTMLElement) {}

  onEvent(e: MatchEvent, nowMs: number): void {
    if (e.type !== "shot" || (e.kind !== "jumper" && e.kind !== "free")) return;
    const tag = this.tags[e.id];
    if (!tag) return;
    tag.grade = e.grade;
    tag.gradeUntil = nowMs + 700;
  }

  update(m: Match, renderer: CourtRenderer, label: (id: number) => TagLabel, width: number, height: number, nowMs: number): void {
    while (this.tags.length < m.athletes.length) this.tags.push(this.make());
    for (const [id, a] of m.athletes.entries()) {
      const tag = this.tags[id]!;
      const at = renderer.tagPoint(id, point);
      const screen = at ? renderer.project(at, width, height) : null;
      const hide = !screen || m.phase === "over";
      tag.root.style.display = hide ? "none" : "";
      if (hide || !screen) continue;
      tag.root.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px) translate(-50%, -100%)`;
      const { name, colour } = label(id);
      if (tag.text !== name) {
        tag.text = name;
        tag.name.textContent = name;
      }
      tag.root.style.setProperty("--tag", colour ?? "#cbd5e1");
      tag.root.classList.toggle("nba-tag--bot", colour === null);
      tag.root.classList.toggle("nba-tag--ball", m.ball.holder === id);
      tag.root.classList.toggle("nba-tag--fire", a.onFire);
      this.meter(tag, m, id, nowMs);
    }
  }

  /** Hides every tag, for the demo game behind the lobby. */
  hide(): void {
    for (const tag of this.tags) tag.root.style.display = "none";
  }

  private meter(tag: Tag, m: Match, id: number, nowMs: number): void {
    const a = m.athletes[id]!;
    const act = a.action;
    const aiming = act.kind === "shoot" && !act.released;
    const showing = aiming || nowMs < tag.gradeUntil;
    tag.meter.style.display = showing ? "" : "none";
    if (!showing) return;
    const free = m.phase === "freeThrow" && m.freeThrows?.shooter === id;
    const half = greenHalfMs(CHARACTERS[a.character].stats.shooting, a.onFire, free);
    tag.green.style.bottom = `${((GREEN_MS - half) / SHOT.meterMs) * 100}%`;
    tag.green.style.height = `${((half * 2) / SHOT.meterMs) * 100}%`;
    if (aiming && act.kind === "shoot") {
      tag.fill.style.height = `${Math.min(100, ((act.t * 1000) / SHOT.meterMs) * 100)}%`;
      tag.meter.dataset.grade = "";
    } else tag.meter.dataset.grade = tag.grade ?? "";
  }

  private make(): Tag {
    const root = document.createElement("div");
    root.className = "nba-tag";
    const meter = document.createElement("div");
    meter.className = "nba-tag__meter";
    const green = document.createElement("div");
    green.className = "nba-tag__green";
    const fill = document.createElement("div");
    fill.className = "nba-tag__fill";
    meter.append(green, fill);
    const name = document.createElement("span");
    name.className = "nba-tag__name";
    root.append(meter, name);
    this.container.appendChild(root);
    return { root, name, meter, fill, green, text: "", grade: null, gradeUntil: 0 };
  }

  dispose(): void {
    for (const tag of this.tags) tag.root.remove();
    this.tags.length = 0;
  }
}
