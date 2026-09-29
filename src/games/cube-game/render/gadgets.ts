import * as THREE from "three";
import type { Level, Orb, Pad } from "../engine/types";
import { glowSprite } from "./textures";
import { MODE_COLOURS, type Theme } from "./themes";

const PAD_COLOUR = 0xffe14d;
const ORB_COLOUR = 0xffd21f;
/** A portal ring's radius, in cubes. Runs nearly always cross portals on the floor. */
const PORTAL_SIZE = 1.6;

/** A colour a little past white, so the bloom gives it a soft glow. */
function bright(hex: number, strength: number): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(strength);
}

function additive(map: THREE.Texture, colour: number, opacity: number): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({ map, color: colour, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
}

/** A chevron pointing right, for speed gates. */
function chevron(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0.8);
  shape.lineTo(0.1, 0);
  shape.lineTo(-0.5, -0.8);
  shape.lineTo(-0.15, -0.8);
  shape.lineTo(0.45, 0);
  shape.lineTo(-0.15, 0.8);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
}

/**
 * The level's moving parts: pads, orbs, mode portals, speed gates and
 * the finish. Few enough to be plain meshes, each with a soft glow.
 */
export class Gadgets {
  readonly group = new THREE.Group();
  private readonly glow = glowSprite();
  private readonly disposables: { dispose(): void }[] = [this.glow];
  private readonly orbs: { orb: Orb; ring: THREE.Mesh; halo: THREE.Sprite }[] = [];
  private readonly pads: { pad: Pad; mesh: THREE.Mesh; halo: THREE.Sprite }[] = [];
  private readonly spinners: THREE.Object3D[] = [];

  constructor(level: Level, theme: Theme) {
    const padGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 24, 1, false, 0, Math.PI);
    padGeometry.rotateX(Math.PI / 2);
    padGeometry.rotateZ(Math.PI / 2);
    padGeometry.scale(1, 0.35, 1);
    const padMaterial = new THREE.MeshBasicMaterial({ color: bright(PAD_COLOUR, 1.3) });
    for (const pad of level.pads) {
      const mesh = new THREE.Mesh(padGeometry, padMaterial);
      mesh.position.set(pad.x + 0.5, pad.y, 0);
      if (pad.dir === -1) mesh.rotation.z = Math.PI;
      const halo = new THREE.Sprite(additive(this.glow, PAD_COLOUR, 0.45));
      halo.scale.set(2.2, 1.4, 1);
      halo.position.set(pad.x + 0.5, pad.y + pad.dir * 0.2, 0.3);
      this.pads.push({ pad, mesh, halo });
      this.group.add(mesh, halo);
    }

    const ringGeometry = new THREE.TorusGeometry(0.42, 0.075, 10, 36);
    const coreGeometry = new THREE.SphereGeometry(0.2, 16, 12);
    const orbMaterial = new THREE.MeshBasicMaterial({ color: bright(ORB_COLOUR, 1.35) });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: bright(0xfff6c0, 1.1) });
    for (const orb of level.orbs) {
      const ring = new THREE.Mesh(ringGeometry, orbMaterial);
      ring.position.set(orb.x, orb.y, 0);
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.copy(ring.position);
      const halo = new THREE.Sprite(additive(this.glow, ORB_COLOUR, 0.5));
      halo.position.set(orb.x, orb.y, 0.4);
      halo.scale.setScalar(2.6);
      this.orbs.push({ orb, ring, halo });
      this.group.add(ring, core, halo);
    }

    // Round, and standing on the floor where runs cross it. Only crossing
    // its x switches the mode, so the ring's size is looks alone.
    const portalRing = new THREE.TorusGeometry(1, 0.12, 10, 56);
    for (const portal of level.portals) {
      const colour = MODE_COLOURS[portal.mode];
      const frame = new THREE.Group();
      frame.position.set(portal.x, PORTAL_SIZE + 0.1, 0);
      const ring = new THREE.Mesh(portalRing, new THREE.MeshBasicMaterial({ color: bright(colour, 1.1) }));
      ring.scale.setScalar(PORTAL_SIZE);
      const inner = new THREE.Mesh(portalRing, new THREE.MeshBasicMaterial({ color: bright(colour, 0.7) }));
      inner.scale.setScalar(PORTAL_SIZE * 0.72);
      const fog = new THREE.Sprite(additive(this.glow, colour, 0.14));
      fog.scale.setScalar(PORTAL_SIZE * 3.2);
      frame.add(ring, inner, fog);
      this.spinners.push(inner);
      this.disposables.push(ring.material, inner.material, fog.material);
      this.group.add(frame);
    }

    const chevronGeometry = chevron();
    for (const gate of level.speeds) {
      const material = new THREE.MeshBasicMaterial({ color: bright(gate.faster ? 0xff4fd8 : 0x4fb8ff, 1.2) });
      this.disposables.push(material);
      const count = gate.faster ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(chevronGeometry, material);
        mesh.position.set(gate.x + (i - (count - 1) / 2) * 0.55, 2.6, -0.15);
        this.group.add(mesh);
      }
    }

    const finish = new THREE.Sprite(additive(this.glow, theme.edge, 0.2));
    finish.scale.set(4, 40, 1);
    finish.position.set(level.endX, 10, -0.5);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 40, 0.1), new THREE.MeshBasicMaterial({ color: bright(theme.edge, 1.1) }));
    beam.position.set(level.endX, 20, 0);
    this.group.add(finish, beam);
    this.disposables.push(padGeometry, padMaterial, ringGeometry, coreGeometry, orbMaterial, coreMaterial, portalRing, chevronGeometry);
    this.disposables.push(finish.material, beam.geometry, beam.material as THREE.Material);
    for (const { halo } of [...this.orbs, ...this.pads]) this.disposables.push(halo.material);
  }

  update(time: number, pulse: number): void {
    for (const { ring, halo } of this.orbs) {
      ring.rotation.y = time * 2.4;
      halo.scale.setScalar(2.2 + pulse * 0.3);
    }
    for (const { halo } of this.pads) halo.material.opacity = 0.35 + pulse * 0.15;
    for (const spinner of this.spinners) spinner.rotation.y = Math.sin(time * 3) * 0.6;
  }

  /** Dims what the player in this view has already used, the way the original does. */
  showUsed(used: { pads: ReadonlySet<object>; orbs: ReadonlySet<object> } | null): void {
    for (const { orb, ring, halo } of this.orbs) {
      const spent = !!used?.orbs.has(orb);
      ring.scale.setScalar(spent ? 1.5 : 1);
      halo.material.opacity = spent ? 0.15 : 0.5;
    }
    for (const { pad, mesh } of this.pads) mesh.scale.y = used?.pads.has(pad) ? 0.6 : 1;
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
  }
}
