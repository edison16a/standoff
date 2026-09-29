import * as THREE from "three";

/** How thick a crosshair's lines are, and the dark edge round them, in radians of view. */
export const LINE = 0.003;
const EDGE = 0.0024;

/** Drawn over everything, untouched by fog or light, so a crosshair reads on any street. */
function flat(color: THREE.ColorRepresentation, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide });
}

/**
 * Draws a crosshair's pieces in its player's colour, each over a dark
 * edge so it stands out against both the fog and the muzzle flash. Sizes
 * and places are angles from the gun's aim, in radians, so a crosshair
 * held one unit from the eye shows exactly the cone the gun fires into.
 */
export class Strokes {
  readonly fill: THREE.MeshBasicMaterial;
  readonly edge: THREE.MeshBasicMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(colour: string, opacity = 0.95) {
    this.fill = flat(colour, opacity);
    this.edge = flat(0x000000, opacity * 0.55);
  }

  /** A straight line from (x1, y1) to (x2, y2). */
  bar(x1: number, y1: number, x2: number, y2: number, width = LINE): THREE.Group {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const group = this.pair(new THREE.PlaneGeometry(length, width), new THREE.PlaneGeometry(length + EDGE, width + EDGE));
    group.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    group.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    return group;
  }

  /** A circle of this radius, drawn as a line. */
  ring(radius: number, width = LINE): THREE.Group {
    const inner = radius - width / 2;
    const outer = radius + width / 2;
    return this.pair(new THREE.RingGeometry(inner, outer, 64), new THREE.RingGeometry(inner - EDGE / 2, outer + EDGE / 2, 64));
  }

  dot(radius: number, x = 0, y = 0): THREE.Group {
    const group = this.pair(new THREE.CircleGeometry(radius, 20), new THREE.CircleGeometry(radius + EDGE / 2, 20));
    group.position.set(x, y, 0);
    return group;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    this.fill.dispose();
    this.edge.dispose();
  }

  private pair(fillGeo: THREE.BufferGeometry, edgeGeo: THREE.BufferGeometry): THREE.Group {
    this.geometries.push(fillGeo, edgeGeo);
    const group = new THREE.Group();
    const edge = new THREE.Mesh(edgeGeo, this.edge);
    const fill = new THREE.Mesh(fillGeo, this.fill);
    edge.renderOrder = 40;
    fill.renderOrder = 41;
    group.add(edge, fill);
    return group;
  }
}
