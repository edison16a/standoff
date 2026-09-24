import * as THREE from "three";
import type { MatchEvent } from "../../engine/events";
import { Rng } from "../../engine/rng";
import { PITCH } from "../../engine/tuning";
import type { MatchView } from "../../engine/view";
import { TEAMS, attackSign } from "../../teams";
import { Confetti } from "./confetti";
import { Fireworks } from "./fireworks";
import { Particles } from "./particles";

const GRASS = [new THREE.Color("#2f7d2f"), new THREE.Color("#3c9a3a"), new THREE.Color("#5a4630"), new THREE.Color("#8ec07c")];
const FLAME = [new THREE.Color("#ffb347"), new THREE.Color("#ff6a1a"), new THREE.Color("#ffe08a")];

/**
 * Everything that bursts: turf thrown up by slides, flame jets and
 * confetti cannons when a goal goes in, fireworks for the winners.
 * Slides are read from the match view rather than events, so a replay
 * sprays turf just like the real thing.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly fireworks: Fireworks;
  private readonly grass: Particles;
  private readonly flames: Particles;
  private readonly confetti = new Confetti();
  private readonly rng = new Rng(12);
  private jets: { x: number; z: number; left: number }[] = [];

  constructor(glow: THREE.Texture) {
    this.grass = new Particles({ max: 900, size: 0.07, map: glow, additive: false, gravity: 9.8, drag: 0.5 });
    this.flames = new Particles({ max: 900, size: 0.9, map: glow, additive: true, gravity: -6, drag: 0.3 });
    this.fireworks = new Fireworks(glow);
    this.group.add(this.grass.points, this.flames.points, this.confetti.mesh, this.fireworks.sparks.points);
  }

  onEvent(event: MatchEvent, view: MatchView): void {
    switch (event.type) {
      case "goal": {
        const team = TEAMS[event.team];
        const s = attackSign(event.team);
        const colours = [team.kit.shirt, team.kit.trim, "#ffd166", team.color];
        for (const z of [-PITCH.halfWidth - 0.6, PITCH.halfWidth + 0.6]) {
          this.confetti.burst(new THREE.Vector3(s * (PITCH.halfLength - 2), 1, z), colours, 160, 5, 11);
          this.jets.push({ x: s * (PITCH.halfLength + 0.6), z: z * 0.45, left: 1.8 });
        }
        this.confetti.burst(new THREE.Vector3(s * (PITCH.halfLength + 2), 1, 0), colours, 120, 4, 13);
        break;
      }
      case "tackle": {
        const a = view.athletes[event.victim ?? event.athlete];
        if (a) this.spray(a.x, a.z, 26);
        break;
      }
      case "shot": {
        const a = view.athletes[event.athlete];
        if (a && event.power > 0.5) this.spray(a.x, a.z, 10);
        break;
      }
      case "fulltime": {
        if (event.winner === null) break;
        const team = TEAMS[event.winner];
        this.fireworks.start([team.kit.shirt, team.color, "#ffd166", "#ffffff"], 14);
        for (const x of [-10, 0, 10]) this.confetti.burst(new THREE.Vector3(x, 2, 0), [team.kit.shirt, team.kit.trim, "#ffd166"], 220, 12, 14);
        break;
      }
      case "kickoff":
        this.fireworks.stop();
        break;
      default:
        break;
    }
  }

  /** Throws up a clump of turf and soil at a spot. */
  private spray(x: number, z: number, count: number): void {
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      this.grass.emit(x + r.range(-0.3, 0.3), 0.05, z + r.range(-0.3, 0.3), r.range(-2, 2), r.range(1.5, 4), r.range(-2, 2), r.pick(GRASS), r.range(0.6, 1.2));
    }
  }

  frame(view: MatchView, dt: number, time: number): void {
    const r = this.rng;
    for (const a of view.athletes) {
      if (a.action !== "slide" || a.actionT > 0.45) continue;
      // Turf kicked up ahead of the sliding boot, flying the way the slide goes.
      const fx = Math.cos(a.facing);
      const fz = Math.sin(a.facing);
      for (let i = 0; i < 3; i++) {
        this.grass.emit(a.x + fx * 0.8, 0.05, a.z + fz * 0.8, fx * r.range(2, 5) + r.range(-1, 1), r.range(1, 3.2), fz * r.range(2, 5) + r.range(-1, 1), r.pick(GRASS), r.range(0.5, 1));
      }
    }
    this.jets = this.jets.filter((jet) => {
      jet.left -= dt;
      for (let i = 0; i < 10; i++) this.flames.emit(jet.x + r.range(-0.15, 0.15), 0.2, jet.z + r.range(-0.15, 0.15), r.range(-0.6, 0.6), r.range(7, 10), r.range(-0.6, 0.6), r.pick(FLAME), r.range(0.35, 0.6));
      return jet.left > 0;
    });
    this.grass.update(dt);
    this.flames.update(dt);
    this.confetti.update(dt, time);
    this.fireworks.update(dt);
  }

  reset(): void {
    this.confetti.clear();
    this.fireworks.stop();
    this.jets = [];
  }

  dispose(): void {
    this.grass.dispose();
    this.flames.dispose();
    this.confetti.dispose();
    this.fireworks.dispose();
  }
}
