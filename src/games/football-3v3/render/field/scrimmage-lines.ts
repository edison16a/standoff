import * as THREE from "three";
import { FIELD } from "../../engine/field";
import type { MatchView } from "../../engine/view";

/** When the broadcast lines are on: while the offense lines up and the play runs. */
export function linesShown(view: MatchView): boolean {
  return view.phase === "choose" || view.phase === "presnap" || view.phase === "live" || view.phase === "convert";
}

/**
 * The television lines painted on the turf: blue for the line of
 * scrimmage, yellow for the first down. They sit just above the grass
 * and under the players, the way a broadcast keys them in, and slide to
 * their new spots between plays instead of jumping.
 */
export class ScrimmageLines {
  readonly group = new THREE.Group();
  private readonly blue: THREE.Mesh;
  private readonly yellow: THREE.Mesh;
  private readonly materials: THREE.MeshBasicMaterial[] = [];
  private shown = 0;
  private blueX = 0;
  private yellowX = 0;

  constructor() {
    const geo = new THREE.PlaneGeometry(0.32, FIELD.halfWidth * 2);
    geo.rotateX(-Math.PI / 2);
    const make = (color: string) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      this.materials.push(m);
      const mesh = new THREE.Mesh(geo, m);
      mesh.renderOrder = 1;
      mesh.position.y = 0.02;
      this.group.add(mesh);
      return mesh;
    };
    this.blue = make("#2f7bff");
    this.yellow = make("#ffe11a");
  }

  update(view: MatchView, dt: number): void {
    const on = linesShown(view);
    this.shown += ((on ? 1 : 0) - this.shown) * (1 - Math.exp(-dt * 6));
    const d = view.drive;
    // Snap straight to the spot while hidden, glide while shown.
    const k = this.shown < 0.05 ? 1 : 1 - Math.exp(-dt * 5);
    this.blueX += (d.losX - this.blueX) * k;
    if (d.firstDownX !== null) this.yellowX += (d.firstDownX - this.yellowX) * k;
    this.blue.position.x = this.blueX;
    this.yellow.position.x = this.yellowX;
    this.blue.visible = this.shown > 0.02;
    this.yellow.visible = this.shown > 0.02 && d.firstDownX !== null;
    for (const m of this.materials) m.opacity = 0.88 * this.shown;
  }

  dispose(): void {
    this.blue.geometry.dispose();
    for (const m of this.materials) m.dispose();
  }
}
