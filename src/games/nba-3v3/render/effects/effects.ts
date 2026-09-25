import * as THREE from "three";
import type { MatchEvent } from "../../engine/events";
import type { Match } from "../../engine/match";
import { RIM } from "../../engine/tuning";
import { seeded } from "../../engine/rng";
import { TEAMS } from "../../roster";
import type { Arena } from "../arena/arena";
import type { TvCamera } from "../tv-camera";
import { Confetti } from "./confetti";
import { Particles } from "./particles";

/**
 * Every visual beat of the game: sparks and a shaking rim on a dunk,
 * the net whipping on a swish, a splash of light on a three, dust off a
 * hard landing, a flash on a block, flames round a ball on fire, camera
 * flashes in the stands on big plays, and confetti and fireworks for
 * the winners.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly glow = new Particles(1400, true);
  private readonly soft = new Particles(500, false);
  private readonly confetti = new Confetti();
  private fireworksLeft = 0;
  private nextFirework = 0;
  private winColours: string[] = [];
  private flashes = 0;
  /** Seeded, so a captured showcase looks the same on every run. */
  private readonly rng = seeded(99);

  constructor(
    private readonly arena: Arena,
    private readonly tv: TvCamera,
  ) {
    this.group.add(this.glow.points, this.soft.points, this.confetti.mesh);
  }

  setView(heightPx: number, fov: number): void {
    this.glow.setView(heightPx, fov);
    this.soft.setView(heightPx, fov);
  }

  onEvent(e: MatchEvent, m: Match): void {
    const hoop = this.arena.hoop;
    const crowd = this.arena.crowd;
    const ball = m.ball.pos;
    switch (e.type) {
      case "dunk": {
        hoop.knock(1);
        hoop.net.whip(1.2);
        this.tv.shake(e.power, 0.5);
        crowd.cheer(1);
        this.glow.burst({ x: RIM.x, y: RIM.y + 0.05, z: RIM.z, count: 70, colour: "#ffd166", speed: [2, 6], up: 0.55, life: [0.3, 0.8], size: [0.05, 0.12], gravity: 6 }, this.rng);
        const a = m.athletes[e.id];
        if (a) this.soft.burst({ x: a.x, y: a.y + 2, z: a.z, count: 26, colour: "#dbeafe", speed: [1, 3], up: 0.7, life: [0.5, 0.9], size: [0.02, 0.04], gravity: 9 }, this.rng);
        this.flashes = 1.2;
        return;
      }
      case "rim":
        hoop.knock(0.25 + e.power * 0.4);
        hoop.net.sway(e.power, (ball.x - RIM.x) * 4, (ball.z - RIM.z) * 4);
        return;
      case "board":
        hoop.knock(0.15 * e.power);
        return;
      case "net":
        hoop.net.whip(e.swish ? 1 : 0.6);
        return;
      case "score":
        crowd.cheer(e.points === 3 ? 0.95 : 0.75);
        if (e.points === 3) this.glow.burst({ x: RIM.x, y: RIM.y - 0.2, z: RIM.z, count: 60, colour: TEAMS[e.team].color, speed: [1.5, 4], up: 0.3, life: [0.4, 1], size: [0.06, 0.14], gravity: 2 }, this.rng);
        if (e.kind !== "dunk" && e.points === 3) this.flashes = 0.8;
        return;
      case "block":
        this.glow.burst({ x: ball.x, y: ball.y, z: ball.z, count: 40, colour: "#ffffff", speed: [1.5, 4], life: [0.2, 0.5], size: [0.06, 0.14], gravity: 0, drag: 0.05 }, this.rng);
        this.tv.shake(0.5, 0.3);
        crowd.cheer(0.9);
        return;
      case "steal":
      case "intercept":
        this.glow.burst({ x: ball.x, y: ball.y, z: ball.z, count: 24, colour: "#7dd3fc", speed: [1, 3], life: [0.2, 0.4], size: [0.05, 0.1], gravity: 0, drag: 0.05 }, this.rng);
        crowd.cheer(0.7);
        return;
      case "land": {
        const a = m.athletes[e.id];
        if (a && e.hard) this.soft.burst({ x: a.x, y: 0.05, z: a.z, count: 20, colour: "#c8a47a", speed: [0.8, 2], up: 0.25, life: [0.4, 0.7], size: [0.08, 0.18], gravity: 1, drag: 0.1 }, this.rng);
        return;
      }
      case "knockdown":
        this.tv.shake(0.4, 0.3);
        crowd.cheer(0.6);
        return;
      case "violation":
        hoop.light("#ff2d2d", 1.2);
        return;
      case "onFire":
        crowd.cheer(0.9);
        return;
      case "win":
        this.celebrate([TEAMS[e.team].color, TEAMS[e.team].trim, "#ffffff", "#facc15"]);
        hoop.light("#ffd166", 6);
        crowd.cheer(1);
        return;
      default:
        return;
    }
  }

  /** Confetti from four cannons and a few seconds of fireworks over the stands. */
  celebrate(colours: string[]): void {
    this.winColours = colours;
    for (const [x, z] of [[-7, 0.5], [7, 0.5], [-7, 10.5], [7, 10.5]] as const) this.confetti.fire(x, z, colours, 150, this.rng);
    this.fireworksLeft = 6;
    this.nextFirework = 0;
    this.flashes = 3;
  }

  reset(): void {
    this.confetti.clear();
    this.fireworksLeft = 0;
  }

  frame(m: Match, dt: number): void {
    const b = m.ball;
    const holder = b.holder !== null ? m.athletes[b.holder] : null;
    const shooter = b.shot ? m.athletes[b.shot.shooter] : null;
    if (holder?.onFire || (b.mode === "flight" && shooter?.onFire)) {
      this.glow.burst({ x: b.pos.x, y: b.pos.y, z: b.pos.z, count: 3, colour: this.rng() < 0.5 ? "#ff7a18" : "#ffd23f", speed: [0.2, 0.8], up: 0.9, life: [0.25, 0.5], size: [0.1, 0.2], gravity: -2, drag: 0.3 }, this.rng);
    }
    if (this.fireworksLeft > 0) {
      this.fireworksLeft -= dt;
      this.nextFirework -= dt;
      if (this.nextFirework <= 0) {
        this.nextFirework = 0.35 + this.rng() * 0.3;
        const colour = this.winColours[Math.floor(this.rng() * this.winColours.length)] ?? "#ffffff";
        this.glow.burst({ x: (this.rng() - 0.5) * 24, y: 11 + this.rng() * 5, z: -8 - this.rng() * 6, count: 90, colour, speed: [3, 6], life: [0.8, 1.4], size: [0.25, 0.45], gravity: 2.5, drag: 0.35 }, this.rng);
      }
    }
    // Photographers and phones flash in the stands on the big moments.
    if (this.flashes > 0) {
      this.flashes -= dt;
      if (this.rng() < 0.7) {
        const side = this.rng();
        const x = side < 0.6 ? (this.rng() - 0.5) * 30 : (side < 0.8 ? -1 : 1) * (12 + this.rng() * 8);
        const z = side < 0.6 ? -5.5 - this.rng() * 10 : this.rng() * 16 - 2;
        this.glow.burst({ x, y: 0.9 + this.rng() * 6, z, count: 1, colour: "#ffffff", speed: [0, 0], life: [0.06, 0.1], size: [0.5, 0.8], gravity: 0 }, this.rng);
      }
    }
    this.glow.update(dt);
    this.soft.update(dt);
    this.confetti.update(dt);
  }

  dispose(): void {
    this.glow.dispose();
    this.soft.dispose();
    this.confetti.dispose();
  }
}
