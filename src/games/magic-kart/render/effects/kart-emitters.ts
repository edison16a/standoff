import * as THREE from "three";
import { driftTier } from "../../engine/drive";
import { speedOf, type Kart } from "../../engine/kart";
import type { KartView } from "../kart-view";
import { kartDesign } from "../models/karts";
import type { Flares } from "./flares";
import type { Particles } from "./particles";
import type { Streaks } from "./streaks";

/** Drift sparks, from a fresh slide through blue and orange to purple. */
export const SPARKS = ["#ffe9a0", "#39b8ff", "#ff8a1f", "#c56bff"] as const;
const at = new THREE.Vector3();
const ahead = new THREE.Vector3();
const behind = new THREE.Vector3();
const rand = (spread: number) => (Math.random() - 0.5) * spread;

export interface Pools {
  glow: Particles;
  smoke: Particles;
  streaks: Streaks;
  flares: Flares;
}

/**
 * Sparks spray from the rear tyres while a kart drifts, thicker and
 * hotter as the turbo charges, skipping off the road behind it, with a
 * glowing ball of the charge colour at each tyre. The streaks inherit
 * the kart's own speed, so they trail behind it as real sparks do.
 */
export function driftSparks(kart: Kart, view: KartView, p: Pools, ground: number): void {
  const design = kartDesign(kart.character);
  const tier = driftTier(kart.driftTime);
  const color = SPARKS[tier];
  const back = { x: -Math.sin(kart.heading), z: -Math.cos(kart.heading) };
  for (const w of design.wheels) {
    if (w.front) continue;
    view.worldPoint(w.at[0], 0.04, w.at[2] - w.radius * 0.4, at);
    p.glow.emit({ x: at.x, y: at.y + 0.12, z: at.z, life: 0.08, size: 0.45 + tier * 0.22, color, alpha: tier === 0 ? 0.35 : 0.85 });
    const count = tier === 0 ? (Math.random() < 0.4 ? 1 : 0) : Math.random() < 0.5 ? tier : tier - 1 + (Math.random() < 0.5 ? 1 : 0);
    const out = Math.sign(w.at[0]);
    const side = { x: Math.cos(kart.heading) * out, z: -Math.sin(kart.heading) * out };
    for (let n = 0; n < count; n++) {
      const sp = 3 + Math.random() * 4;
      const spread = rand(2.4);
      p.streaks.emit({
        x: at.x + rand(0.12),
        y: at.y + 0.04,
        z: at.z + rand(0.12),
        vx: kart.vx * 0.55 + back.x * sp + side.x * (1.2 + spread),
        vy: 1.5 + Math.random() * 3.2,
        vz: kart.vz * 0.55 + back.z * sp + side.z * (1.2 + spread),
        life: 0.25 + Math.random() * 0.25,
        color,
        width: 0.016 + tier * 0.005,
        floor: ground,
      });
    }
  }
}

/** Fire and the odd backfire pop from the exhausts while boosting, plus the glow of hot tips. */
export function boostFire(kart: Kart, view: KartView, p: Pools, plasma: boolean): void {
  const design = kartDesign(kart.character);
  for (const e of design.exhausts) {
    view.bodyPoint(e[0], e[1], e[2] - 0.15, at);
    const hot = plasma ? (Math.random() < 0.5 ? "#7ff0ff" : "#8f6bff") : Math.random() < 0.5 ? "#ffb030" : "#ff5a1f";
    p.glow.emit({ x: at.x, y: at.y, z: at.z, vx: -kart.vx * 0.15 + rand(1), vy: rand(1) + 0.4, vz: -kart.vz * 0.15 + rand(1), life: 0.22, size: 0.7, grow: 0.4, color: hot });
    behind.set(-Math.sin(kart.heading), 0.25, -Math.cos(kart.heading)).normalize();
    p.flares.add(at, behind, plasma ? "#6ff4ff" : "#ff9a3a", 1.3 + Math.random() * 0.4, 0.75);
    if (Math.random() < 0.05) {
      // A backfire: a bright pop and a puff of dark smoke.
      p.glow.emit({ x: at.x, y: at.y, z: at.z, life: 0.12, size: 1.3, color: plasma ? "#e8fdff" : "#fff1b0" });
      p.smoke.emit({ x: at.x, y: at.y + 0.05, z: at.z, vx: rand(0.6), vy: 0.8, vz: rand(0.6), life: 0.9, size: 0.5, grow: 3, color: "#3a3640", alpha: 0.45 });
    }
  }
}

/** A puff of smoke and a flash from every exhaust as a boost kicks in. */
export function boostPuff(kart: Kart, view: KartView, p: Pools): void {
  for (const e of kartDesign(kart.character).exhausts) {
    view.bodyPoint(e[0], e[1], e[2], at);
    p.glow.emit({ x: at.x, y: at.y, z: at.z, life: 0.15, size: 1.6, color: "#fff1b0" });
    for (let i = 0; i < 5; i++) {
      p.smoke.emit({ x: at.x, y: at.y, z: at.z, vx: -kart.vx * 0.1 + rand(1.6), vy: 0.6 + Math.random(), vz: -kart.vz * 0.1 + rand(1.6), drag: 0.1, life: 0.8 + Math.random() * 0.4, size: 0.45, grow: 3.2, color: "#4a4652", alpha: 0.4 });
    }
  }
}

/** Halos over the lamps: headlamps always, tail lamps brighter while braking. */
export function lampFlares(kart: Kart, view: KartView, p: Pools, night: boolean): void {
  const design = kartDesign(kart.character);
  const braking = kart.brakeHeld > 0 && speedOf(kart) > 0.5;
  ahead.set(Math.sin(kart.heading), 0, Math.cos(kart.heading));
  behind.copy(ahead).negate();
  for (const l of design.lamps.head) {
    view.bodyPoint(l[0], l[1], l[2] + 0.05, at);
    p.flares.add(at, ahead, "#fff2d2", night ? 1.1 : 0.55, night ? 0.85 : 0.45);
  }
  for (const l of design.lamps.tail) {
    view.bodyPoint(l[0], l[1], l[2] - 0.05, at);
    p.flares.add(at, behind, "#ff2a24", braking ? 0.8 : night ? 0.45 : 0.3, braking ? 0.9 : 0.4);
  }
}
