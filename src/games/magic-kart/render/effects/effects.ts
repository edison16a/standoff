import * as THREE from "three";
import type { RaceEvent } from "../../engine/events";
import { speedOf } from "../../engine/kart";
import { DRIFT } from "../../engine/tuning";
import type { RaceWorld } from "../../engine/world";
import type { KartView } from "../kart-view";
import { kartDesign } from "../models/karts";
import { softDot } from "../textures";
import { Particles } from "./particles";

const RAINBOW = ["#ff4d5e", "#ffb347", "#ffe14d", "#6cf08a", "#5fd8ff", "#c77dff"];
const at = new THREE.Vector3();

/**
 * All the particles in a race: drift sparks and tyre smoke, boost flames,
 * dust off the road, bursts when cubes break and karts get hit, and the
 * trails behind thrown power ups. Two pools: one that glows, one that
 * does not.
 */
export class Effects {
  readonly group = new THREE.Group();
  readonly glow: Particles;
  readonly smoke: Particles;

  constructor(private readonly dust: string) {
    this.glow = new Particles(2400, softDot(), true);
    this.smoke = new Particles(1400, softDot("rgba(255,255,255,0.85)", "rgba(255,255,255,0)"), false);
    this.group.add(this.smoke.points, this.glow.points);
  }

  setView(pixels: number, fov: number): void {
    this.glow.setViewHeight(pixels, fov);
    this.smoke.setViewHeight(pixels, fov);
  }

  /** Emitters that run every frame from each kart's state. */
  frame(world: RaceWorld, views: ReadonlyMap<number, KartView>, dt: number): void {
    for (const kart of world.karts) {
      const view = views.get(kart.id);
      if (!view) continue;
      const design = kartDesign(kart.character);
      const speed = speedOf(kart);
      const rear = design.wheels.filter((w) => !w.front);
      if (kart.timers.boost > 0) {
        for (const e of design.exhausts) {
          view.worldPoint(e[0], e[1], e[2] - 0.3, at);
          this.glow.emit({ x: at.x, y: at.y, z: at.z, vx: -kart.vx * 0.2 + rand(1), vy: rand(1) + 0.5, vz: -kart.vz * 0.2 + rand(1), life: 0.25, size: 0.9, grow: 0.3, color: Math.random() < 0.5 ? "#ffb030" : "#ff5a1f" });
        }
      }
      if (kart.drift !== 0 && !kart.airborne) {
        const hot = kart.driftTime >= DRIFT.orangeAt ? "#ff8a1f" : kart.driftTime >= DRIFT.blueAt ? "#39b8ff" : "#fff3b0";
        for (const w of rear) {
          view.worldPoint(w.at[0], 0.05, w.at[2], at);
          this.glow.emit({ x: at.x, y: at.y + 0.1, z: at.z, vx: rand(4), vy: 2 + Math.random() * 3, vz: rand(4), life: 0.35, size: 0.28, gravity: 14, color: hot });
          if (Math.random() < 0.5) this.smoke.emit({ x: at.x, y: at.y + 0.2, z: at.z, vy: 0.6, life: 0.9, size: 1.1, grow: 2.6, color: "#e8e8ee", alpha: 0.35 });
        }
      }
      if (kart.surface === "offroad" && speed > 6 && !kart.airborne && Math.random() < 0.6) {
        for (const w of rear) {
          view.worldPoint(w.at[0], 0.1, w.at[2], at);
          this.smoke.emit({ x: at.x, y: at.y, z: at.z, vx: rand(1.5), vy: 1.2, vz: rand(1.5), life: 0.8, size: 0.9, grow: 2.8, color: this.dust, alpha: 0.5 });
        }
      }
      if (kart.timers.ice > 0 && Math.random() < 0.5) {
        this.glow.emit({ x: kart.x + rand(2), y: kart.y + 0.4 + Math.random(), z: kart.z + rand(2), vy: 0.4, life: 0.8, size: 0.25, color: "#bff3ff" });
      }
      if (kart.timers.ghost > 0 && Math.random() < 0.3) {
        this.glow.emit({ x: kart.x + rand(2), y: kart.y + Math.random() * 1.5, z: kart.z + rand(2), vy: 0.6, life: 0.7, size: 0.2, color: "#d9ccff", alpha: 0.4 });
      }
    }
    for (const p of world.projectiles) {
      const color = p.kind === "orb" ? (Math.random() < 0.5 ? "#ffe14d" : "#ffb030") : "#bff3ff";
      this.glow.emit({ x: p.x + rand(0.4), y: p.y + rand(0.4), z: p.z + rand(0.4), vy: 0.3, life: 0.5, size: 0.45, color });
    }
    this.glow.update(dt);
    this.smoke.update(dt);
  }

  /** One off bursts for race events. */
  onEvent(event: RaceEvent, world: RaceWorld): void {
    if (!("kart" in event)) return;
    const kart = world.karts[event.kart];
    if (!kart) return;
    const { x, y, z } = kart;
    switch (event.type) {
      case "pickup":
        this.burst(x, y + 1.2, z, 26, 7, () => RAINBOW[Math.floor(Math.random() * RAINBOW.length)]!, 0.4);
        break;
      case "hit":
        if (event.by === "ice") this.burst(x, y + 0.8, z, 30, 6, () => (Math.random() < 0.5 ? "#bff3ff" : "#ffffff"), 0.35);
        else {
          this.burst(x, y + 1, z, 22, 8, () => (Math.random() < 0.5 ? "#ffe14d" : "#ffffff"), 0.45);
          for (let i = 0; i < 10; i++) this.smoke.emit({ x: x + rand(1.5), y: y + 0.6, z: z + rand(1.5), vy: 1.5, life: 1.1, size: 1.6, grow: 2.2, color: "#9a9aa6", alpha: 0.5 });
        }
        break;
      case "blocked":
        this.burst(x, y + 1, z, 30, 7, () => "#5fffd0", 0.35);
        break;
      case "land":
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          this.smoke.emit({ x, y: y + 0.2, z, vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, vy: 0.5, drag: 0.05, life: 0.7, size: 1, grow: 2.5, color: this.dust, alpha: 0.5 });
        }
        break;
      case "fell":
        this.burst(x, y, z, 30, 6, () => "#ffffff", 0.5);
        break;
      case "respawn":
        this.burst(x, y + 1, z, 24, 4, () => RAINBOW[Math.floor(Math.random() * RAINBOW.length)]!, 0.3);
        break;
      case "boost":
        if (event.source !== "pad") this.burst(x, y + 0.6, z, 12, 4, () => "#ffb030", 0.35);
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

  dispose(): void {
    this.glow.dispose();
    this.smoke.dispose();
  }
}

function rand(spread: number): number {
  return (Math.random() - 0.5) * spread;
}
