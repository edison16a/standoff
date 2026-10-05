import * as THREE from "three";
import type { RaceEvent } from "../../engine/events";
import { speedOf } from "../../engine/kart";
import type { RaceWorld } from "../../engine/world";
import type { KartView } from "../kart-view";
import { kartDesign } from "../models/karts";
import { softDot } from "../textures";
import { Flares } from "./flares";
import { boostFire, boostPuff, driftSparks, lampFlares, type Pools } from "./kart-emitters";
import { Particles } from "./particles";
import { SkidMarks } from "./skid-marks";
import { Streaks } from "./streaks";

const RAINBOW = ["#ff4d5e", "#ffb347", "#ffe14d", "#6cf08a", "#5fd8ff", "#c77dff"];
const at = new THREE.Vector3();

/**
 * All the particles in a race: drift sparks and tyre smoke, boost fire,
 * dust off the road, bursts when cubes break and karts get hit, glows
 * over the lamps, and the trails behind thrown power ups. Glowing and
 * plain sprite pools, a pool of spark streaks and the lamp halos: four
 * draws for everything. The skid marks sliding wheels leave ride along.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly glow: Particles;
  readonly smoke: Particles;
  private readonly streaks = new Streaks(1600);
  private readonly flares = new Flares(96);
  private readonly marks = new SkidMarks();
  private readonly pools: Pools;

  constructor(private readonly dust: string, private readonly night = false) {
    this.glow = new Particles(2400, softDot(), true);
    this.smoke = new Particles(1400, softDot("rgba(255,255,255,0.85)", "rgba(255,255,255,0)"), false);
    this.pools = { glow: this.glow, smoke: this.smoke, streaks: this.streaks, flares: this.flares };
    this.group.add(this.marks.mesh, this.smoke.points, this.glow.points, this.streaks.mesh, this.flares.points);
  }

  setView(pixels: number, fov: number): void {
    this.glow.setViewHeight(pixels, fov);
    this.smoke.setViewHeight(pixels, fov);
    this.flares.setViewHeight(pixels, fov);
  }

  /** Emitters that run every frame from each kart's state. */
  frame(world: RaceWorld, views: ReadonlyMap<number, KartView>, dt: number): void {
    this.flares.begin();
    for (const kart of world.karts) {
      const view = views.get(kart.id);
      if (!view) continue;
      const design = kartDesign(kart.character);
      const speed = speedOf(kart);
      const ghost = kart.timers.ghost > 0;
      const rear = design.wheels.filter((w) => !w.front);
      if (!ghost) lampFlares(kart, view, this.pools, this.night);
      if (kart.timers.boost > 0 && !ghost) boostFire(kart, view, this.pools, design.flame === "plasma");
      const drifting = kart.drift !== 0 && !kart.airborne;
      // A hard stop leaves rubber too, though only a drift throws sparks.
      const skidding = drifting || (kart.brakeHeld > 0.15 && speed > 9 && !kart.airborne);
      rear.forEach((w, i) => {
        const key = kart.id * 4 + i;
        if (!skidding || kart.surface === "offroad") return this.marks.lift(key);
        view.worldPoint(w.at[0], 0.02, w.at[2], at);
        this.marks.lay(key, at);
        if (Math.random() < (drifting ? 0.5 : 0.3)) this.smoke.emit({ x: at.x, y: at.y + 0.15, z: at.z, vx: rand(1), vy: 0.6, vz: rand(1), life: 0.9, size: 0.75, grow: 2.6, color: "#ececf2", alpha: 0.28 });
      });
      if (drifting && kart.surface !== "offroad") {
        view.worldPoint(0, 0, 0, at);
        driftSparks(kart, view, this.pools, at.y + 0.02);
      }
      if (kart.surface === "offroad" && speed > 6 && !kart.airborne && Math.random() < 0.6) {
        for (const w of rear) {
          view.worldPoint(w.at[0], 0.1, w.at[2], at);
          this.smoke.emit({ x: at.x, y: at.y, z: at.z, vx: rand(1.5), vy: 1.2, vz: rand(1.5), life: 0.8, size: 0.9, grow: 2.8, color: this.dust, alpha: 0.5 });
        }
      }
      // Thin vapour streams off the wing tips while gliding fast.
      if (kart.glide > 0.85 && speed > 12 && !ghost) {
        for (const side of [1, -1]) {
          view.glider.tipWorld(side, at);
          this.smoke.emit({ x: at.x, y: at.y, z: at.z, vx: rand(0.3), vy: 0, vz: rand(0.3), life: 0.55, size: 0.28, grow: 1.6, color: "#ffffff", alpha: 0.32 });
        }
      }
      if (kart.timers.ice > 0 && Math.random() < 0.5) {
        this.glow.emit({ x: kart.x + rand(2), y: kart.y + 0.4 + Math.random(), z: kart.z + rand(2), vy: 0.4, life: 0.8, size: 0.25, color: "#bff3ff" });
      }
      if (ghost && Math.random() < 0.3) {
        this.glow.emit({ x: kart.x + rand(2), y: kart.y + Math.random() * 1.5, z: kart.z + rand(2), vy: 0.6, life: 0.7, size: 0.2, color: "#d9ccff", alpha: 0.4 });
      }
    }
    for (const p of world.projectiles) {
      const color = p.kind === "orb" ? (Math.random() < 0.5 ? "#ffe14d" : "#ffb030") : "#bff3ff";
      this.glow.emit({ x: p.x + rand(0.4), y: p.y + rand(0.4), z: p.z + rand(0.4), vy: 0.3, life: 0.5, size: 0.45, color });
    }
    this.flares.end();
    this.glow.update(dt);
    this.smoke.update(dt);
    this.streaks.update(dt);
    this.marks.frame(dt);
  }

  /** One off bursts for race events. */
  onEvent(event: RaceEvent, world: RaceWorld, views: ReadonlyMap<number, KartView>): void {
    if (!("kart" in event)) return;
    const kart = world.karts[event.kart];
    if (!kart) return;
    const { x, y, z } = kart;
    const view = views.get(kart.id);
    switch (event.type) {
      case "pickup":
        this.burst(x, y + 1.2, z, 26, 7, () => RAINBOW[Math.floor(Math.random() * RAINBOW.length)]!, 0.4);
        break;
      case "hit":
        if (event.by === "ice") this.burst(x, y + 0.8, z, 30, 6, () => (Math.random() < 0.5 ? "#bff3ff" : "#ffffff"), 0.35);
        else {
          this.burst(x, y + 1, z, 22, 8, () => (Math.random() < 0.5 ? "#ffe14d" : "#ffffff"), 0.45);
          this.sparkBurst(x, y + 0.5, z, 36, 9, "#ffd27a", y);
          for (let i = 0; i < 10; i++) this.smoke.emit({ x: x + rand(1.5), y: y + 0.6, z: z + rand(1.5), vy: 1.5, life: 1.1, size: 1.6, grow: 2.2, color: "#9a9aa6", alpha: 0.5 });
        }
        break;
      case "bump":
        this.sparkBurst(x, y + 0.35, z, Math.round(6 + event.strength * 14), 5, "#ffcf7a", y);
        break;
      case "blocked":
        this.burst(x, y + 1, z, 30, 7, () => "#5fffd0", 0.35);
        break;
      case "land":
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          this.smoke.emit({ x, y: y + 0.2, z, vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, vy: 0.5, drag: 0.05, life: 0.7, size: 1, grow: 2.5, color: this.dust, alpha: 0.5 });
        }
        if (event.airTime > 0.5) this.sparkBurst(x, y + 0.1, z, 14, 4, "#ffe9a0", y);
        break;
      case "fell":
        this.burst(x, y, z, 30, 6, () => "#ffffff", 0.5);
        break;
      case "respawn":
        this.burst(x, y + 1, z, 24, 4, () => RAINBOW[Math.floor(Math.random() * RAINBOW.length)]!, 0.3);
        break;
      case "boost":
        if (view && event.source !== "pad") boostPuff(kart, view, this.pools);
        break;
      default:
        break;
    }
  }

  private burst(x: number, y: number, z: number, count: number, speed: number, color: () => string, size: number): void {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const up = Math.random();
      this.glow.emit({ x, y, z, vx: Math.cos(theta) * speed * (1 - up * 0.5), vy: up * speed, vz: Math.sin(theta) * speed * (1 - up * 0.5), gravity: 9, drag: 0.2, life: 0.7 + Math.random() * 0.4, size, color: color() });
    }
  }

  /** Metal on metal: streaks flung out low, skipping off the road. */
  private sparkBurst(x: number, y: number, z: number, count: number, speed: number, color: string, floor: number): void {
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.streaks.emit({ x, y, z, vx: Math.cos(theta) * sp, vy: 1 + Math.random() * 4, vz: Math.sin(theta) * sp, life: 0.35 + Math.random() * 0.35, color, width: 0.03, floor: floor + 0.02 });
    }
  }

  dispose(): void {
    this.glow.dispose();
    this.smoke.dispose();
    this.streaks.dispose();
    this.flares.dispose();
    this.marks.dispose();
  }
}

function rand(spread: number): number {
  return (Math.random() - 0.5) * spread;
}
