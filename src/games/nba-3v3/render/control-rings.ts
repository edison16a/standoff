import * as THREE from "three";
import type { Match } from "../engine/match";

/** One phone and the player it moves right now. */
export interface Pilot {
  seat: number;
  id: number;
  colour: string;
}

interface Ring {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  id: number;
  /** Seconds since the ring last jumped to a new player, for the slide and the pulse. */
  since: number;
  x: number;
  z: number;
}

const geometry = new THREE.RingGeometry(0.5, 0.62, 48, 1);
/** How fast a ring slides to the player a phone just took over: most of the way in a fifth of a second. */
const SLIDE_RATE = 14;

/**
 * A ring on the floor under every player a phone controls, in that
 * phone's colour. When a pass hands control to the receiver the ring
 * slides across to him and pulses, so the player sees at once who
 * they are now.
 */
export class ControlRings {
  readonly group = new THREE.Group();
  private readonly rings = new Map<number, Ring>();

  update(m: Match, pilots: readonly Pilot[], dt: number, shown: boolean): void {
    const live = new Set<number>();
    for (const p of pilots) {
      const a = m.athletes[p.id];
      if (!a) continue;
      live.add(p.seat);
      const ring = this.ring(p, a.x, a.z);
      if (ring.id !== p.id) {
        ring.id = p.id;
        ring.since = 0;
      }
      ring.since += dt;
      const k = 1 - Math.exp(-dt * SLIDE_RATE);
      ring.x += (a.x - ring.x) * k;
      ring.z += (a.z - ring.z) * k;
      // A fresh ring swells and settles, so the change of control reads at a glance.
      const pulse = 1 + 0.45 * Math.exp(-ring.since * 5) * Math.abs(Math.cos(ring.since * 9));
      ring.mesh.position.set(ring.x, 0.012, ring.z);
      ring.mesh.scale.setScalar(pulse);
      ring.mesh.material.opacity = 0.75 + 0.25 * Math.exp(-ring.since * 3);
      ring.mesh.visible = shown;
    }
    for (const [seat, ring] of this.rings) {
      if (live.has(seat)) continue;
      this.group.remove(ring.mesh);
      ring.mesh.material.dispose();
      this.rings.delete(seat);
    }
  }

  private ring(p: Pilot, x: number, z: number): Ring {
    let ring = this.rings.get(p.seat);
    if (!ring) {
      const material = new THREE.MeshBasicMaterial({ color: p.colour, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      ring = { mesh, id: p.id, since: 9, x, z };
      this.rings.set(p.seat, ring);
    }
    ring.mesh.material.color.set(p.colour);
    return ring;
  }

  dispose(): void {
    for (const ring of this.rings.values()) ring.mesh.material.dispose();
    this.rings.clear();
  }
}
