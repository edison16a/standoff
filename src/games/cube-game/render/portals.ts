import * as THREE from "three";
import type { Mode, Portal } from "../engine/types";
import { portalIcon } from "./portal-icons";
import { MODE_COLOURS } from "./themes";

/** How far the ring is turned from facing the camera, so it is seen side on like the original's. */
const TURN = -0.95;
/** The ring's half width across its face, before the turn narrows it on screen. */
const HALF_WIDTH = 1.2;
const TUBE = 0.11;
/** How big the picture of the new form is, in blocks. */
const ICON = 1.8;
/** How much of each glow's push past white is kept, matching the other gadgets. */
const CALM = 0.45;

function bright(hex: number, strength: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(1 + (strength - 1) * CALM);
}

/** A round tube along an upright oval, so the ring keeps its round look however tall it is. */
function ovalRing(halfWidth: number, halfHeight: number, tube: number): THREE.TubeGeometry {
  const oval = new THREE.EllipseCurve(0, 0, halfWidth, halfHeight, 0, Math.PI * 2, false, 0);
  const points = oval.getPoints(72).map((p) => new THREE.Vector3(p.x, p.y, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 96, tube, 10, true);
}

/**
 * The mode portals: tall rings turned sideways, filling the opening the
 * level leaves for them between its walls, each with a picture of the
 * form the player becomes floating in the middle.
 */
export class Portals {
  readonly group = new THREE.Group();
  private readonly spinners: THREE.Object3D[] = [];
  private readonly icons: THREE.Sprite[] = [];
  private readonly disposables: { dispose(): void }[] = [];

  constructor(portals: readonly Portal[], glow: THREE.Texture) {
    const pictures = new Map<Mode, THREE.SpriteMaterial>();
    for (const portal of portals) {
      const colour = MODE_COLOURS[portal.mode];
      const halfHeight = (portal.top - portal.bottom) / 2 - TUBE;
      const middle = (portal.top + portal.bottom) / 2;
      const outer = ovalRing(HALF_WIDTH, halfHeight, TUBE);
      const inner = ovalRing(HALF_WIDTH * 0.72, halfHeight * 0.84, TUBE * 0.6);
      const outerMaterial = new THREE.MeshBasicMaterial({ color: bright(colour, 1.7) });
      const innerMaterial = new THREE.MeshBasicMaterial({ color: bright(colour, 1.0), transparent: true, opacity: 0.8 });
      const ring = new THREE.Group();
      ring.position.set(portal.x, middle, 0);
      ring.rotation.y = TURN;
      const spinner = new THREE.Mesh(inner, innerMaterial);
      ring.add(new THREE.Mesh(outer, outerMaterial), spinner);
      this.spinners.push(spinner);

      const fog = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: colour, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
      fog.scale.set(HALF_WIDTH * 3, halfHeight * 2.6, 1);
      fog.position.set(portal.x, middle, -0.2);

      let picture = pictures.get(portal.mode);
      if (!picture) {
        picture = new THREE.SpriteMaterial({ map: portalIcon(portal.mode, colour), transparent: true, depthWrite: false });
        pictures.set(portal.mode, picture);
        this.disposables.push(picture.map!, picture);
      }
      // Just behind the play, so a player passing through draws over it.
      const icon = new THREE.Sprite(picture);
      icon.scale.setScalar(Math.min(ICON, halfHeight * 1.1));
      icon.position.set(portal.x, middle, -0.35);
      this.icons.push(icon);

      this.group.add(ring, fog, icon);
      this.disposables.push(outer, inner, outerMaterial, innerMaterial, fog.material);
    }
  }

  update(time: number, pulse: number): void {
    for (const spinner of this.spinners) spinner.rotation.y = Math.sin(time * 3) * 0.5;
    // The pictures brighten a touch on the beat, so they catch the eye without moving about.
    for (const icon of this.icons) icon.material.opacity = 0.85 + pulse * 0.15;
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
  }
}
