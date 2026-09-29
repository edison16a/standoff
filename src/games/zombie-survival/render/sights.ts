import type * as THREE from "three";
import type { AimCaster } from "./aim-caster";
import type { Sight } from "./crosshair/crosshair-layer";
import type { Shooter } from "./first-person";
import type { SceneSource } from "./scene-source";

const STILL = { x: 0, y: 0 };

/**
 * Every player with a gun this frame: where the gun points in the world,
 * for the guns and their lasers, and each sight, for the crosshairs. The
 * kick rides on the phone's aim the same way the shot's raycast adds it,
 * so the laser, the crosshair and the next bullet all agree.
 */
export function aimAll(source: SceneSource, caster: AimCaster, targets: readonly THREE.Object3D[], nowMs: number): { shooters: Shooter[]; sights: Sight[] } {
  const shooters: Shooter[] = [];
  const sights: Sight[] = [];
  for (const { seat, weapon } of source.armed()) {
    const point = source.aimAt(seat, nowMs);
    const kick = source.game.squad.get(seat)?.gun.recoil.offset ?? STILL;
    shooters.push({ seat, weapon, aim: point ? caster.cast(point, kick, targets, () => undefined).point : null });
    sights.push({ seat, weapon, point, kick });
  }
  return { shooters, sights };
}
