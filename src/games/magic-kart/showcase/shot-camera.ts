import * as THREE from "three";
import type { RaceWorld } from "../engine/world";
import { packFocus } from "./pack";
import type { Rig } from "./shots";

const wantPos = new THREE.Vector3();
const wantLook = new THREE.Vector3();

/** How far to close a gap this frame, the same over time whatever the frame rate. */
function ease(dt: number, rate: number): number {
  return 1 - Math.exp(-rate * dt);
}

/**
 * The showcase's camera operator. Each rig frames the pack its own way,
 * measured along the road rather than from any one kart's nose, so the
 * shot glides instead of twitching with every steer. A cut snaps straight
 * to the new framing.
 */
export class ShotCamera {
  readonly camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.3, 1400);
  private readonly pos = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private fov = 55;
  private fresh = true;

  cut(): void {
    this.fresh = true;
  }

  aim(world: RaceWorld, rig: Rig, dt: number): void {
    const focus = packFocus(world);
    const f = world.track.frameAt(focus.lead.loc.s);
    let fov: number;
    switch (rig.kind) {
      case "chase":
        wantPos.set(focus.x - f.tx * rig.back + f.rx * rig.side, focus.y + rig.height, focus.z - f.tz * rig.back + f.rz * rig.side);
        wantLook.set(focus.x + f.tx * 9, focus.y + 1, focus.z + f.tz * 9);
        fov = rig.fov;
        break;
      case "post": {
        const p = world.track.pointAt(rig.at * world.track.length, rig.d);
        wantPos.set(p.x, p.y + rig.height, p.z);
        wantLook.set(focus.x, focus.y + 0.8, focus.z);
        // Zoom in on a far pack and out as it comes close, like a trackside television camera.
        const dist = wantPos.distanceTo(wantLook);
        fov = THREE.MathUtils.clamp(2 * THREE.MathUtils.radToDeg(Math.atan(rig.frame / 2 / dist)), 6, 70);
        break;
      }
      case "hero": {
        const kart = world.karts[rig.kart] ?? focus.lead;
        const a = kart.heading + rig.angle;
        wantPos.set(kart.x + Math.sin(a) * rig.dist, kart.y + rig.height, kart.z + Math.cos(a) * rig.dist);
        wantLook.set(kart.x, kart.y + rig.aim, kart.z);
        fov = rig.fov;
        break;
      }
    }
    // A close up is held exactly on its kart, which at full speed would outrun any smoothing.
    if (this.fresh || rig.kind === "hero") {
      this.pos.copy(wantPos);
      this.look.copy(wantLook);
      this.fov = fov;
      this.fresh = false;
    } else {
      // Quick enough to keep up with a kart at full speed, slow enough to hide the pack changing shape.
      this.pos.lerp(wantPos, ease(dt, 9));
      this.look.lerp(wantLook, ease(dt, 9));
      this.fov += (fov - this.fov) * ease(dt, 6);
    }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
