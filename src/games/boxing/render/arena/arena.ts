import * as THREE from "three";
import { seeded, type Random } from "../../engine/random";
import { Particles } from "../fx/particles";
import { glowTexture, ledTexture } from "./arena-textures";
import { Crowd } from "./crowd";
import { buildRing, PLATFORM } from "./ring";

/** The lighting rig hangs this high over the canvas. */
const TRUSS_Y = 6.2;
const TRUSS_HALF = 3.6;

/**
 * Everything around the fight: the ring on its platform, the ringside
 * boards, the crowd rising into the dark, the square lighting truss with
 * its lamps and light shafts, a big screen over the ring, and camera
 * flashes popping in the stands. The lights are few and strong: one key
 * light with shadows straight down on the canvas and four hard rim
 * lights from the truss corners, so the boxers stand out from the dark.
 */
export class Arena {
  readonly group = new THREE.Group();
  readonly crowd = new Crowd();
  readonly flashes: Particles;
  readonly key: THREE.SpotLight;
  private readonly ring = buildRing();
  private readonly disposables: { dispose(): void }[] = [];
  private readonly random: Random = seeded(7);
  private readonly shafts: THREE.Mesh[] = [];
  private flashTimer = 0;

  constructor() {
    this.group.add(this.ring.group, this.crowd.group);
    const glow = this.keep(glowTexture());
    this.flashes = new Particles(64, glow, true);
    this.group.add(this.flashes.points);

    this.group.add(new THREE.HemisphereLight("#5a6a9a", "#140c18", 0.22));
    this.key = new THREE.SpotLight("#fff4e6", 95, 16, 0.62, 0.45, 1.2);
    this.key.position.set(0, TRUSS_Y + 1.2, 0);
    this.key.target.position.set(0, 0, 0);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 3;
    this.key.shadow.camera.far = 12;
    this.group.add(this.key, this.key.target);
    // Two hard rim lights from opposite corners of the truss, warm and cool, carve the boxers
    // out of the dark from any camera. Directional lights, since they cost least per pixel.
    for (const [x, z, colour, power] of [
      [-1, -1, "#ffd2b0", 2.2],
      [1, 1, "#bcd4ff", 2.0],
    ] as const) {
      const rim = new THREE.DirectionalLight(colour, power);
      rim.position.set(x * TRUSS_HALF, TRUSS_Y, z * TRUSS_HALF);
      rim.target.position.set(0, 1, 0);
      this.group.add(rim, rim.target);
    }

    this.buildFloor();
    this.buildBoards();
    this.buildTruss(glow);
    this.buildScreen();
  }

  /**
   * Moves the crowd and the flashes on. `excite` is 0 calm to 1 on its
   * feet. Flashes fire more often when the crowd is excited, and all at
   * once for a knockdown.
   */
  update(time: number, dt: number, excite: number): void {
    this.crowd.update(time, 0.15 + excite * 0.85);
    this.flashTimer -= dt;
    const rate = 1.2 + excite * 10;
    while (this.flashTimer <= 0) {
      this.flashTimer += (0.5 + this.random()) / rate;
      this.flash();
    }
    this.flashes.update(dt);
    for (const [i, shaft] of this.shafts.entries()) {
      (shaft.material as THREE.MeshBasicMaterial).opacity = 0.05 + 0.015 * Math.sin(time * 0.7 + i * 1.9);
    }
  }

  /** A burst of camera flashes across the stands, for knockdowns and the final bell. */
  burst(count: number): void {
    for (let i = 0; i < count; i++) this.flash();
  }

  setViewHeight(pixels: number): void {
    this.flashes.setViewHeight(pixels);
  }

  dispose(): void {
    this.ring.dispose();
    this.crowd.dispose();
    this.flashes.dispose();
    for (const d of this.disposables) d.dispose();
  }

  private flash(): void {
    const faces = this.crowd.faces;
    const face = faces[Math.floor(this.random() * faces.length)]!;
    this.flashes.spawn({ x: face.x, y: face.y + 0.1, z: face.z, life: 0.12, size: 0.55 + this.random() * 0.4, color: "#f4f8ff", alpha: 1 });
  }

  private keep<T extends { dispose(): void }>(thing: T): T {
    this.disposables.push(thing);
    return thing;
  }

  /** A dark polished floor round the ring that picks up the lights. */
  private buildFloor(): void {
    const floor = new THREE.Mesh(
      this.keep(new THREE.PlaneGeometry(60, 60)),
      this.keep(new THREE.MeshStandardMaterial({ color: "#0c0d14", roughness: 0.35, metalness: 0.2 })),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -PLATFORM;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  /** Glowing boards on the press tables all round the ring. */
  private buildBoards(): void {
    const led = this.keep(ledTexture());
    led.repeat.set(3, 1);
    const board = this.keep(new THREE.MeshBasicMaterial({ map: led, toneMapped: false }));
    const table = this.keep(new THREE.MeshStandardMaterial({ color: "#14151d", roughness: 0.6 }));
    const length = 9;
    const faceGeo = this.keep(new THREE.PlaneGeometry(length, 0.55));
    const tableGeo = this.keep(new THREE.BoxGeometry(length, 0.75, 0.7));
    for (let side = 0; side < 4; side++) {
      const angle = (side * Math.PI) / 2;
      const out = 4.5;
      const group = new THREE.Group();
      group.rotation.y = angle;
      const desk = new THREE.Mesh(tableGeo, table);
      desk.position.set(0, -PLATFORM + 0.375, out);
      const face = new THREE.Mesh(faceGeo, board);
      face.position.set(0, -PLATFORM + 0.42, out - 0.36);
      face.rotation.y = Math.PI;
      group.add(desk, face);
      this.group.add(group);
    }
  }

  /** The square truss over the ring, its lamp cans and the shafts of light they throw through the haze. */
  private buildTruss(glow: THREE.Texture): void {
    const metal = this.keep(new THREE.MeshStandardMaterial({ color: "#2a2c34", metalness: 0.8, roughness: 0.35 }));
    const beam = this.keep(new THREE.BoxGeometry(TRUSS_HALF * 2 + 0.3, 0.25, 0.25));
    for (let side = 0; side < 4; side++) {
      const piece = new THREE.Mesh(beam, metal);
      const angle = (side * Math.PI) / 2;
      piece.position.set(Math.sin(angle) * TRUSS_HALF, TRUSS_Y, Math.cos(angle) * TRUSS_HALF);
      piece.rotation.y = angle + Math.PI / 2;
      this.group.add(piece);
    }
    const can = this.keep(new THREE.CylinderGeometry(0.16, 0.2, 0.34, 14));
    const lens = this.keep(new THREE.MeshBasicMaterial({ color: "#fff8e8", toneMapped: false }));
    const lensGeo = this.keep(new THREE.CircleGeometry(0.15, 16));
    const halo = this.keep(new THREE.SpriteMaterial({ map: glow, color: "#fff2d8", blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    const shaftGeo = this.keep(new THREE.ConeGeometry(1.4, TRUSS_Y + 0.4, 24, 1, true));
    shaftGeo.translate(0, -(TRUSS_Y + 0.4) / 2, 0);
    for (let side = 0; side < 4; side++) {
      for (const along of [-2.2, -0.75, 0.75, 2.2]) {
        const angle = (side * Math.PI) / 2;
        const x = Math.sin(angle) * TRUSS_HALF + Math.cos(angle) * along;
        const z = Math.cos(angle) * TRUSS_HALF - Math.sin(angle) * along;
        const lamp = new THREE.Group();
        lamp.position.set(x, TRUSS_Y - 0.25, z);
        lamp.lookAt(x * 0.15, 0, z * 0.15);
        const body = new THREE.Mesh(can, metal);
        body.rotation.x = Math.PI / 2;
        const face = new THREE.Mesh(lensGeo, lens);
        face.position.z = 0.18;
        const sprite = new THREE.Sprite(halo);
        sprite.scale.setScalar(0.9);
        sprite.position.z = 0.2;
        lamp.add(body, face, sprite);
        this.group.add(lamp);
      }
    }
    // Four soft shafts of light falling through the haze onto the canvas.
    for (const [x, z] of [
      [-1, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
    ] as const) {
      const shaft = new THREE.Mesh(
        shaftGeo,
        this.keep(new THREE.MeshBasicMaterial({ color: "#fff1dc", transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
      );
      shaft.position.set(x * TRUSS_HALF, TRUSS_Y, z * TRUSS_HALF);
      // The cone's tip is at the lamp and its open base falls on the canvas near the middle.
      const down = new THREE.Vector3(-x * 0.6, 0, -z * 0.6).sub(shaft.position).normalize();
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
      this.shafts.push(shaft);
      this.group.add(shaft);
    }
  }

  /** A four sided screen hanging over the ring, like a real arena's. */
  private buildScreen(): void {
    const led = this.keep(ledTexture());
    const face = this.keep(new THREE.MeshBasicMaterial({ map: led, toneMapped: false, color: "#d8d8ff" }));
    const frame = this.keep(new THREE.MeshStandardMaterial({ color: "#101014", metalness: 0.6, roughness: 0.4 }));
    const box = new THREE.Mesh(this.keep(new THREE.BoxGeometry(3, 1.1, 3)), [face, face, frame, frame, face, face]);
    box.position.y = TRUSS_Y + 2.4;
    this.group.add(box);
  }
}
