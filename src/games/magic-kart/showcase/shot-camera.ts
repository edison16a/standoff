import * as THREE from "three";
import type { RaceWorld } from "../engine/world";
import { packFocus } from "./pack";
import type { Rig } from "./shots";
import { framingAt, type Framing } from "./sweep";

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

  /** Frames the shot. `t` is race seconds since the shot began, for rigs that move through it. */
  aim(world: RaceWorld, rig: Rig, dt: number, t = 0): void {
    const focus = packFocus(world);
    const f = world.track.frameAt(focus.lead.loc.s);
    let fov: number;
    switch (rig.kind) {
      case "chase":
      case "sweep": {
        const at: Framing = rig.kind === "chase" ? rig : framingAt(rig.keys, world.time);
        wantPos.set(focus.x - f.tx * at.back + f.rx * at.side, focus.y + at.height, focus.z - f.tz * at.back + f.rz * at.side);
        wantLook.set(focus.x + f.tx * 9, focus.y + 1, focus.z + f.tz * 9);
        fov = at.fov;
        break;
      }
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
        // Measured from the road rather than the kart's nose, a kart spun by a hit does not whirl the camera round.
        const road = world.track.frameAt(kart.loc.s);
        const a = (rig.road ? Math.atan2(road.tx, road.tz) : kart.heading) + rig.angle + (rig.orbit ?? 0) * t;
        const dist = rig.dist + (rig.push ?? 0) * t;
        wantPos.set(kart.x + Math.sin(a) * dist, kart.y + rig.height, kart.z + Math.cos(a) * dist);
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
