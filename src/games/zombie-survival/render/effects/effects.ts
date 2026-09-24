import * as THREE from "three";
import { flashTexture, glowTexture } from "../textures";
import { Particles } from "./particles";

export type Impact = "flesh" | "armor" | "weak" | "world" | "none";

interface Tracer {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
}

interface Flash {
  sprite: THREE.Sprite;
  life: number;
  /** Drawn at least once. A flash made between two slow frames must still be seen. */
  shown: boolean;
}

const SPARK = new THREE.Color(1, 0.72, 0.3);
const GOO = new THREE.Color(0.35, 0.95, 0.2);
const BLOOD = new THREE.Color(0.25, 0.5, 0.08);
const WEAK = new THREE.Color(1, 0.55, 0.15);
const DUST = new THREE.Color(0.45, 0.43, 0.4);
const SMOKE = new THREE.Color(0.1, 0.1, 0.1);
const FIRE = new THREE.Color(1, 0.45, 0.1);

/**
 * Everything a shot leaves in the air: the flash at the muzzle with its
 * burst of light, a streak of tracer to the hit, sparks off stone and
 * armour, green goo from flesh, and a burning orange spray from weak
 * points. Also the chopper's smoke and the crash's fireball.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly sparks = new Particles(700, 0.09, true, 9);
  private readonly goo = new Particles(600, 0.13, false, 7);
  private readonly smoke = new Particles(500, 1.6, false, -1.2);
  private readonly tracers: Tracer[] = [];
  private readonly flashes: Flash[] = [];
  private readonly light = new THREE.PointLight(0xffc070, 0, 10, 1.6);
  private lightLife = 0;
  private lightFresh = false;
  private readonly tracerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true).rotateX(Math.PI / 2);

  constructor() {
    this.group.add(this.sparks.points, this.goo.points, this.smoke.points, this.light);
  }

  muzzle(at: THREE.Vector3, dir: THREE.Vector3, big: boolean): void {
    const material = new THREE.SpriteMaterial({ map: flashTexture(), color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, rotation: Math.random() * Math.PI });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(at).addScaledVector(dir, 0.05);
    sprite.scale.setScalar(big ? 0.4 : 0.26);
    this.group.add(sprite);
    this.flashes.push({ sprite, life: 0.06, shown: false });
    this.light.position.copy(at);
    this.light.intensity = big ? 40 : 22;
    this.lightLife = 0.06;
    this.lightFresh = true;
    this.sparks.burst(at, dir, big ? 6 : 3, 4, 0.8, SPARK, 0.12);
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, colour: THREE.Color): void {
    let tracer = this.tracers.find((t) => t.t >= 1);
    if (!tracer) {
      const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      tracer = { mesh: new THREE.Mesh(this.tracerGeo, material), from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1 };
      this.tracers.push(tracer);
      this.group.add(tracer.mesh);
    }
    tracer.from.copy(from);
    tracer.to.copy(to);
    tracer.t = 0;
    (tracer.mesh.material as THREE.MeshBasicMaterial).color.copy(colour).lerp(new THREE.Color(1, 0.95, 0.8), 0.6);
    tracer.mesh.visible = true;
  }

  impact(at: THREE.Vector3, normal: THREE.Vector3, kind: Impact): void {
    if (kind === "flesh") {
      this.goo.burst(at, normal, 14, 3.2, 1.4, GOO, 0.7);
      this.goo.burst(at, normal, 6, 1.5, 1, BLOOD, 0.9);
    } else if (kind === "weak") {
      this.goo.burst(at, normal, 20, 4, 1.6, GOO, 0.8);
      this.sparks.burst(at, normal, 18, 5, 1.6, WEAK, 0.5);
    } else if (kind === "armor") {
      this.sparks.burst(at, normal, 16, 6, 1.4, SPARK, 0.35);
    } else if (kind === "world") {
      this.sparks.burst(at, normal, 9, 4.5, 1.2, SPARK, 0.3);
      this.smoke.burst(at, normal, 2, 0.6, 0.6, DUST, 0.8);
    }
  }

  /** A bigger spray for a kill or a broken weak point. */
  splatter(at: THREE.Vector3, big: boolean): void {
    const up = new THREE.Vector3(0, 1, 0);
    this.goo.burst(at, up, big ? 60 : 24, big ? 5 : 3, 2, GOO, 1);
    if (big) this.sparks.burst(at, up, 30, 6, 2, WEAK, 0.6);
  }

  /** Smoke rising from the burning chopper. */
  puff(at: THREE.Vector3, fire: boolean): void {
    this.smoke.burst(at, new THREE.Vector3(0, 1, 0), 1, 1.2, 0.6, SMOKE, 3);
    if (fire) this.sparks.burst(at, new THREE.Vector3(0, 1, 0), 2, 2, 1, FIRE, 0.5);
  }

  explosion(at: THREE.Vector3): void {
    this.sparks.burst(at, new THREE.Vector3(0, 1, 0), 160, 14, 2.2, FIRE, 1.4);
    this.smoke.burst(at, new THREE.Vector3(0, 1, 0), 40, 4, 1.5, SMOKE, 4);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff8a30, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sprite.position.copy(at);
    sprite.scale.setScalar(30);
    this.group.add(sprite);
    this.flashes.push({ sprite, life: 0.9, shown: false });
  }

  update(dt: number): void {
    this.sparks.update(dt);
    this.goo.update(dt);
    this.smoke.update(dt);
    // The muzzle light, like the flash, always gets one frame on screen.
    if (this.lightFresh) this.lightFresh = false;
    else this.lightLife -= dt;
    if (this.lightLife <= 0) this.light.intensity = 0;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i]!;
      if (!flash.shown) {
        flash.shown = true;
        continue;
      }
      flash.life -= dt;
      flash.sprite.material.opacity = Math.min(1, flash.life * 12);
      if (flash.life <= 0) {
        this.group.remove(flash.sprite);
        flash.sprite.material.dispose();
        this.flashes.splice(i, 1);
      }
    }
    for (const tracer of this.tracers) {
      if (tracer.t >= 1) continue;
      tracer.t = Math.min(1, tracer.t + dt / 0.07);
      // A short bright streak that runs from the muzzle to the hit.
      const head = tracer.from.clone().lerp(tracer.to, Math.min(1, tracer.t * 1.3));
      const tail = tracer.from.clone().lerp(tracer.to, Math.max(0, tracer.t * 1.3 - 0.45));
      const length = head.distanceTo(tail);
      tracer.mesh.position.copy(head).add(tail).multiplyScalar(0.5);
      tracer.mesh.lookAt(head);
      tracer.mesh.scale.set(1, 1, Math.max(0.01, length));
      (tracer.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - tracer.t * 0.6;
      tracer.mesh.visible = tracer.t < 1;
    }
  }

  dispose(): void {
    this.sparks.dispose();
    this.goo.dispose();
    this.smoke.dispose();
    this.tracerGeo.dispose();
    for (const t of this.tracers) (t.mesh.material as THREE.Material).dispose();
  }
}
