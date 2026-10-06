import type * as THREE from "three";
import type { RaceWorld } from "../engine/world";
import { ShowCamera } from "./cameras";
import { ChaseCamera } from "./chase-camera";
import type { ViewRect } from "./layout";

/** One viewport: whose kart it follows (null for the lobby's show camera) and where it sits. */
export interface ViewSpec {
  kartId: number | null;
  rect: ViewRect;
  /** A camera the caller moves itself, like the showcase's directed shots. */
  camera?: THREE.PerspectiveCamera;
}

/**
 * The cameras for every view: a chase camera per player view, the show
 * camera that rides behind the leader in the lobby, or a camera the
 * caller brings. Hits and landings shake the right view's camera, and a
 * respawned kart's camera snaps to it instead of swinging across the map.
 */
export class ViewCameras {
  private chase: ChaseCamera[] = [];
  private readonly show = new ShowCamera();
  private readonly snap = new Set<number>();
  private viewKarts: (number | null)[] = [];

  reset(): void {
    this.chase = [];
    this.show.reset();
  }

  /** The chase camera following a kart, if a view follows it. */
  following(kartId: number): ChaseCamera | undefined {
    const index = this.viewKarts.indexOf(kartId);
    return index >= 0 ? this.chase[index] : undefined;
  }

  snapTo(kartId: number): void {
    this.snap.add(kartId);
  }

  /** Called once a frame before the views are drawn. */
  begin(views: readonly ViewSpec[]): void {
    this.viewKarts = views.map((v) => v.kartId);
    while (this.chase.length < views.length) this.chase.push(new ChaseCamera());
  }

  /** Called once a frame after the views are drawn. */
  end(): void {
    this.snap.clear();
  }

  /** The view's own camera if it brings one, else the chase camera for its kart, else the show camera. */
  pick(view: ViewSpec, i: number, aspect: number, world: RaceWorld, time: number, dt: number): THREE.PerspectiveCamera {
    if (view.camera) {
      if (Math.abs(view.camera.aspect - aspect) > 1e-3) {
        view.camera.aspect = aspect;
        view.camera.updateProjectionMatrix();
      }
      return view.camera;
    }
    const kart = view.kartId !== null ? world.karts[view.kartId] : world.standings[0];
    if (view.kartId !== null && kart) {
      const chase = this.chase[i]!;
      chase.setAspect(aspect);
      chase.follow(kart, dt, this.snap.has(kart.id));
      return chase.camera;
    }
    this.show.setAspect(aspect);
    if (kart) this.show.follow(kart, time, dt);
    return this.show.camera;
  }
}
