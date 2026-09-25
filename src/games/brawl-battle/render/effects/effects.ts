import * as THREE from "three";
import type { MatchEvent } from "../../engine/events";
import { crowdFade } from "../hit-flash";
import type { HitSound } from "../../engine/moves";
import { Rng } from "../../engine/rng";
import type { MatchState } from "../../engine/types";
import { CHARACTERS } from "../../roster";
import type { FrameCamera } from "../camera/frame-camera";
import { FX, type FighterColours } from "../colors";
import { Confetti } from "./confetti";
import { Particles } from "./particles";
import { Pulses } from "./pulses";

type HitEvent = Extract<MatchEvent, { type: "hit" }>;

const SPARK: Record<HitSound, string> = { punch: "#fff3b0", kick: "#ffd166", slash: "#e0f2fe", magic: "#d8b4fe", slam: "#fb923c" };

/**
 * Every visual beat of a fight, driven by the match's events: impact
 * stars and shockwaves on hits, a cut streak on sword hits, screen shake
 * that grows with the launch, dust off jumps and landings, the long
 * colour beam of a KO at the blast line, the flare of an ult, and
 * confetti for the winner.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly glow = new Particles(1600, true);
  readonly soft = new Particles(500, false);
  readonly pulses = new Pulses();
  private readonly confetti = new Confetti();
  private colours: FighterColours[] = [];
  /** Seeded, so a captured showcase looks the same on every run. */
  private readonly rng = new Rng(77);
  private readonly roll = () => this.rng.next();

  constructor(private readonly camera: FrameCamera) {
    this.group.add(this.soft.points, this.glow.points, this.pulses.group, this.confetti.mesh);
  }

  setColours(colours: FighterColours[]): void {
    this.colours = colours;
  }

  setView(heightPx: number, fov: number): void {
    this.glow.setView(heightPx, fov);
    this.soft.setView(heightPx, fov);
  }

  colourOf(id: number): string {
    return this.colours[id]?.colour ?? "#ffffff";
  }

  /** `struck` is how many hits landed this step, so a crowd hit at once sparks softer. */
  onEvent(e: MatchEvent, state: MatchState, struck = 1): void {
    switch (e.type) {
      case "hit":
        return this.hit(e, state.fighters[e.attacker]?.facing ?? 1, crowdFade(struck));
      case "block":
        this.pulses.spawn({ kind: "ring", x: e.x, y: e.y, colour: "#67e8f9", from: 0.6, to: 1.8, life: 0.25 });
        return;
      case "shieldBreak": {
        const f = state.fighters[e.id];
        if (!f) return;
        this.pulses.spawn({ kind: "star", x: f.pos.x, y: f.pos.y + 1, colour: "#67e8f9", from: 1.5, to: 4, life: 0.4, spin: 3 });
        this.glow.burst({ x: f.pos.x, y: f.pos.y + 1, z: 0, count: 50, colour: "#a5f3fc", speed: [4, 10], up: 0.6, life: [0.3, 0.7], size: [0.12, 0.25], gravity: 12 }, this.roll);
        this.camera.shake(0.5);
        return;
      }
      case "jump":
      case "land": {
        const f = state.fighters[e.id];
        if (!f) return;
        const double = e.type === "jump" && e.double;
        if (double) this.pulses.spawn({ kind: "ring", x: f.pos.x, y: f.pos.y, colour: "#ffffff", from: 0.4, to: 1.6, life: 0.3, thin: 0.35, opacity: 0.8 });
        else this.dust(f.pos.x, f.pos.y, e.type === "land" ? 10 : 6);
        return;
      }
      case "ult": {
        const f = state.fighters[e.id];
        if (!f) return;
        const aura = FX[f.character].aura;
        this.pulses.spawn({ kind: "ring", x: f.pos.x, y: f.pos.y + 1, colour: aura, from: 1, to: 7, life: 0.6, opacity: 0.7 });
        this.pulses.spawn({ kind: "star", x: f.pos.x, y: f.pos.y + 1, colour: "#ffffff", from: 2, to: 5, life: 0.35, spin: 2 });
        this.glow.burst({ x: f.pos.x, y: f.pos.y + 1, z: 0, count: 90, colour: aura, speed: [4, 12], up: 0.55, life: [0.4, 1.0], size: [0.15, 0.3], gravity: 2, drag: 0.2 }, this.roll);
        this.camera.shake(0.45);
        return;
      }
      case "ultReady": {
        const f = state.fighters[e.id];
        if (f) this.sparkle(f.pos.x, f.pos.y + CHARACTERS[f.character].physique.height / 2, this.colourOf(e.id), 30);
        return;
      }
      case "respawn": {
        const f = state.fighters[e.id];
        if (f?.platform) this.sparkle(f.platform.x, f.platform.y + 1, this.colourOf(e.id), 40);
        return;
      }
      case "ko":
        return this.ko(e.x, e.y, this.colourOf(e.id), state);
      case "game":
        return this.celebrate(e.winner, state);
    }
  }

  /** Embers rising round a fighter, for a moment each frame of an ult. */
  aura(x: number, y: number, height: number, colour: string, count = 2): void {
    this.glow.burst({ x, y: y + height * 0.5, z: 0, count, colour, speed: [0.5, 2], up: 0.9, life: [0.3, 0.7], size: [0.1, 0.22], gravity: -4, push: { x: 0, y: 1, z: 0 } }, this.roll);
  }

  /** Sparks shed by a magic bolt in flight. */
  ember(x: number, y: number, colour: string): void {
    this.glow.burst({ x, y, z: 0, count: 2, colour, speed: [0.3, 1.2], up: 0.5, life: [0.15, 0.35], size: [0.1, 0.22], gravity: 0, drag: 0.2 }, this.roll);
  }

  sparkle(x: number, y: number, colour: string, count: number): void {
    this.glow.burst({ x, y, z: 0, count, colour, speed: [1.5, 4], up: 0.6, life: [0.4, 0.9], size: [0.08, 0.18], gravity: 1, drag: 0.3 }, this.roll);
  }

  dust(x: number, y: number, count: number): void {
    this.soft.burst({ x, y: y + 0.1, z: 0, count, colour: "#e7e5e4", speed: [1, 3], up: 0.25, life: [0.3, 0.6], size: [0.25, 0.5], gravity: -1, drag: 0.05 }, this.roll);
  }

  /** A puff of smoke behind a fighter flying from a big hit. */
  smoke(x: number, y: number): void {
    this.soft.burst({ x, y, z: 0, count: 1, colour: "#cbd5e1", speed: [0.2, 0.6], up: 0.5, life: [0.4, 0.7], size: [0.4, 0.7], gravity: -0.5, drag: 0.2 }, this.roll);
  }

  update(dt: number): void {
    this.glow.update(dt);
    this.soft.update(dt);
    this.pulses.update(dt);
    this.confetti.update(dt);
  }

  reset(): void {
    this.pulses.clear();
    this.confetti.clear();
  }

  private hit(e: HitEvent, facing: number, fade: number): void {
    const { x, y, sound, damage, heavy, speed } = e;
    const colour = SPARK[sound];
    const size = 0.9 + damage * 0.07 + (heavy ? 0.6 : 0);
    this.pulses.spawn({ kind: "star", x, y, colour, from: size * 0.6, to: size * 1.3, life: heavy ? 0.22 : 0.15, angle: this.roll() * 3, spin: 2, opacity: fade });
    if (heavy) this.pulses.spawn({ kind: "ring", x, y, colour: colour, from: 0.4, to: size * 1.8, life: 0.3, opacity: 0.6 * fade });
    if (sound === "slash") this.pulses.spawn({ kind: "streak", x, y, colour: "#ffffff", from: size * 2.2, to: size * 2.8, life: 0.18, thin: 0.08, angle: (this.roll() - 0.5) * 1.2 + (facing > 0 ? -0.5 : 0.5), opacity: fade });
    this.glow.burst({ x, y, z: 0.3, count: Math.round((8 + damage * 1.6) * fade), colour, speed: [3, 7 + speed * 0.3], up: 0.5, life: [0.15, 0.4], size: [0.08, 0.16], gravity: 10, drag: 0.1, push: { x: facing * 2, y: 0, z: 0 } }, this.roll);
    this.camera.shake(Math.min(0.7, (heavy ? 0.25 : 0.08) + speed * 0.012));
  }

  private ko(x: number, y: number, colour: string, state: MatchState): void {
    const { blast } = state.stage;
    // The beam shoots in from the edge the fighter crossed, toward the middle of the stage.
    const angle = Math.atan2((blast.top + blast.bottom) / 2 - y, (blast.left + blast.right) / 2 - x);
    for (const [w, c, life] of [[0.5, colour, 1.2], [0.22, "#ffffff", 0.9]] as const) {
      this.pulses.spawn({ kind: "beam", x, y, z: 0.2, colour: c, from: 10, to: 22, life, angle, thin: w });
    }
    this.pulses.spawn({ kind: "ring", x, y, colour, from: 1, to: 10, life: 0.6 });
    this.pulses.spawn({ kind: "star", x, y, colour: "#ffffff", from: 3, to: 7, life: 0.4, spin: 3 });
    const dir = { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10, z: 0 };
    this.glow.burst({ x, y, z: 0, count: 120, colour, speed: [4, 16], up: 0.5, life: [0.5, 1.3], size: [0.2, 0.45], gravity: 2, drag: 0.25, push: dir }, this.roll);
    this.camera.shake(1);
  }

  private celebrate(winner: number | null, state: MatchState): void {
    const main = state.stage.surfaces[0]!;
    const colours = winner === null ? this.colours.map((c) => c.colour) : [this.colourOf(winner), "#ffffff", "#ffd166", this.colourOf(winner)];
    this.confetti.fire(main.x1, 0, 0, colours, 220, this.roll);
    this.confetti.fire(main.x2, 0, 0, colours, 220, this.roll);
  }

  dispose(): void {
    this.glow.dispose();
    this.soft.dispose();
    this.pulses.dispose();
    this.confetti.dispose();
  }
}
