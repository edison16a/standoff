import * as THREE from "three";
import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import type { Offset } from "../../engine/recoil";
import type { WeaponId } from "../../engine/weapons";
import { Crosshair, type ViewSpot } from "./crosshair";

/** One player's sight this frame: their gun, where their phone points and how far the kick has thrown the gun off it. */
export interface Sight {
  seat: Seat;
  weapon: WeaponId;
  point: ScreenPoint | null;
  kick: Offset;
}

/**
 * Every player's crosshair, held in front of the camera so each stays
 * put on screen. The phone's point is turned into a direction through the
 * lens, and the kick is added as angles on top, the same way the shot's
 * raycast adds it, so the crosshair sits exactly where the next bullet goes.
 */
export class CrosshairLayer {
  readonly group = new THREE.Group();
  private readonly marks = new Map<Seat, Crosshair>();

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    camera.add(this.group);
  }

  fire(seat: Seat): void {
    this.marks.get(seat)?.fire();
  }

  update(sights: readonly Sight[], dt: number, visible: boolean): void {
    this.group.visible = visible;
    const tanY = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tanX = tanY * this.camera.aspect;
    const seen = new Set<Seat>();
    for (const sight of sights) {
      seen.add(sight.seat);
      let mark = this.marks.get(sight.seat);
      if (mark && mark.weapon !== sight.weapon) {
        this.drop(sight.seat);
        mark = undefined;
      }
      if (!mark) {
        mark = new Crosshair(sight.weapon, playerColor(sight.seat));
        this.group.add(mark.group);
        this.marks.set(sight.seat, mark);
      }
      const aim: ViewSpot | null = sight.point ? { x: sight.point.x * tanX, y: sight.point.y * tanY } : null;
      // The raycast leans a unit ray off by the kick, which lands this much further out on the plane.
      const lean = aim ? Math.hypot(1, aim.x, aim.y) : 1;
      const gun = aim ? { x: aim.x + lean * Math.tan(sight.kick.x), y: aim.y + lean * Math.tan(sight.kick.y) } : null;
      mark.update(gun, aim, dt);
    }
    for (const seat of [...this.marks.keys()]) if (!seen.has(seat)) this.drop(seat);
  }

  dispose(): void {
    for (const seat of [...this.marks.keys()]) this.drop(seat);
    this.camera.remove(this.group);
  }

  private drop(seat: Seat): void {
    const mark = this.marks.get(seat);
    if (!mark) return;
    this.group.remove(mark.group);
    mark.dispose();
    this.marks.delete(seat);
  }
}
