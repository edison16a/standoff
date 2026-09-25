import * as THREE from "three";
import type { ProjectileLook } from "../../engine/moves";
import { Rng } from "../../engine/rng";
import type { Projectile } from "../../engine/types";
import type { Effects } from "../effects/effects";
import { beamTexture, dotTexture, riseTexture } from "../effects/textures";
import { crescentGeometry, glowing, starGeometry, waveGeometry } from "./shapes";

/** Geometry and textures every shot shares. */
export class ShotKit {
  readonly ball = new THREE.IcosahedronGeometry(1, 1);
  readonly ring = new THREE.TorusGeometry(1, 0.08, 4, 20);
  readonly crescent = crescentGeometry();
  readonly wave = waveGeometry();
  readonly star = starGeometry();
  /** A plane anchored at its left end, for tails that stream behind. */
  readonly tail = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
  readonly dot = dotTexture();
  readonly streak = beamTexture();
  readonly rise = riseTexture();
  /** Seeded, so a filmed showcase sheds the same sparks every time. */
  private readonly rng = new Rng(53);
  readonly roll = () => this.rng.next();

  dispose(): void {
    for (const g of [this.ball, this.ring, this.crescent, this.wave, this.star, this.tail]) g.dispose();
    this.dot.dispose();
    this.streak.dispose();
    this.rise.dispose();
  }
}

const white = "#ffffff";

/**
 * One projectile on screen, with a look for each kind: a crackling bolt,
 * a big swirling orb, the crescent of a flying slash, a wave crest
 * running along the floor, and a falling star with a tail. Only the
 * pieces of the current look are shown.
 */
export class Shot {
  readonly group = new THREE.Group();
  readonly prev = new THREE.Vector2();
  id = -1;
  private look: ProjectileLook = "bolt";
  private readonly looks: Record<ProjectileLook, THREE.Group>;
  /** Materials that take the owner's colour. */
  private readonly tinted: THREE.MeshBasicMaterial[] = [];
  private readonly spin: THREE.Object3D;
  private readonly halo: THREE.Sprite;
  private readonly flow: THREE.Mesh;

  constructor(kit: ShotKit) {
    const mesh = (geo: THREE.BufferGeometry, colour: string | null, opacity = 1, scale = 1, map: THREE.Texture | null = null) => {
      const mat = glowing(colour ?? white, opacity, map);
      if (colour === null) this.tinted.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(scale);
      return m;
    };
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.dot, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.halo.scale.setScalar(3.4);
    this.spin = mesh(kit.ring, null, 0.8, 1.3);
    this.flow = mesh(kit.tail, null, 0.9, 1, kit.streak);
    this.looks = {
      bolt: group(mesh(kit.ball, white, 1, 0.5), mesh(kit.ball, null, 0.55)),
      orb: group(mesh(kit.ball, white, 1, 0.55), mesh(kit.ball, null, 0.6, 0.95), this.halo, this.spin),
      crescent: group(ghost(mesh(kit.crescent, null, 0.35, 1.2)), mesh(kit.crescent, null, 0.95, 1.18), mesh(kit.crescent, white, 0.95, 0.72)),
      wave: group(mesh(kit.wave, null, 0.9, 1, kit.rise), mesh(kit.wave, white, 0.9, 0.5, kit.rise)),
      star: group(this.flow, mesh(kit.star, null, 0.9, 1.3), mesh(kit.star, white, 1, 0.75)),
    };
    for (const g of Object.values(this.looks)) this.group.add(g);
    this.group.visible = false;
  }

  begin(p: Projectile, colour: string): void {
    this.id = p.id;
    this.look = p.look;
    this.prev.set(p.pos.x - p.vel.x / 60, p.pos.y - p.vel.y / 60);
    for (const m of this.tinted) m.color.set(colour);
    this.halo.material.color.set(colour);
    for (const [look, g] of Object.entries(this.looks)) g.visible = look === p.look;
  }

  place(p: Projectile, x: number, y: number, time: number, fx: Effects, colour: string, roll: () => number): void {
    const g = this.group;
    const side = p.vel.x < 0 ? -1 : 1;
    const flicker = Math.sin(time * 30 + p.id);
    g.position.set(x, y, 0);
    g.rotation.set(0, 0, 0);
    g.scale.set(1, 1, 1);
    switch (this.look) {
      case "bolt":
        g.scale.setScalar(p.r * (1.15 + flicker * 0.12));
        g.rotation.set(time * 7, time * 5, 0);
        fx.ember(x, y, colour);
        return;
      case "orb":
        g.scale.setScalar(p.r * (1.05 + flicker * 0.06));
        this.spin.rotation.set(time * 3, time * 5, 0);
        this.halo.material.rotation = time;
        fx.ember(x, y, colour);
        fx.ember(x - side * p.r, y, white);
        return;
      case "crescent":
        // A horizontal cut leaves a crescent lying flat, bulge leading, tipped toward the camera so it reads.
        g.rotation.x = -Math.PI / 2 + 0.6;
        g.scale.set(side * p.r * 3, p.r * (3.8 + flicker * 0.2), 1);
        fx.glow.burst({ x: x - side * p.r * 0.6, y: y + (roll() - 0.5) * p.r * 2.4, z: 0.1, count: 2, colour: flicker > 0 ? white : colour, speed: [0.2, 1], life: [0.12, 0.3], size: [0.06, 0.14], gravity: 0, drag: 0.2, push: { x: -side * 3, y: 0, z: 0 } }, roll);
        return;
      case "wave": {
        // The crest stands on the floor under the shot and heaves as it runs.
        const floor = y - 0.35;
        const height = p.r * (2.6 + Math.abs(Math.sin(time * 26 + p.id)) * 0.5);
        g.position.set(x - side * p.r * 0.3, floor, 0.05);
        g.scale.set(side * p.r * 2.2, height, 1);
        fx.dust(x - side * p.r, floor, 1);
        fx.soft.burst({ x, y: floor + 0.1, z: 0.2, count: 1, colour: "#78350f", speed: [2, 4], up: 0.9, life: [0.3, 0.5], size: [0.08, 0.16], gravity: 18, drag: 0.6 }, roll);
        fx.glow.burst({ x, y: floor + height * 0.6, z: 0.2, count: 2, colour, speed: [1, 3], up: 0.8, life: [0.15, 0.35], size: [0.07, 0.14], gravity: 4, drag: 0.3 }, roll);
        return;
      }
      case "star": {
        g.scale.setScalar(p.r * (1.5 + flicker * 0.1));
        const heading = Math.atan2(-p.vel.y, -p.vel.x);
        for (const child of this.looks.star.children) if (child !== this.flow) child.rotation.z = time * 9;
        this.flow.rotation.z = heading;
        this.flow.scale.set(4.5, 0.55, 1);
        fx.ember(x, y, colour);
        return;
      }
    }
  }

  hide(): void {
    this.id = -1;
    this.group.visible = false;
  }

  dispose(): void {
    this.halo.material.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
    });
  }
}

/** A fainter copy trailing just behind, like an after image. */
function ghost(m: THREE.Mesh): THREE.Mesh {
  m.position.x = -0.35;
  return m;
}

function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.add(...children);
  return g;
}
