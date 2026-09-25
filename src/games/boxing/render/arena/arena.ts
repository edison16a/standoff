import * as THREE from "three";
import { seeded, type Random } from "../../engine/random";
import { Particles } from "../fx/particles";
import { glowTexture, ledTexture } from "./arena-textures";
import { Crowd } from "./crowd";
import { buildRing, PLATFORM } from "./ring";
import { buildTruss, TRUSS_HALF, TRUSS_Y } from "./truss";

/**
 * Everything around the fight: the ring on its platform, the ringside
 * boards, the crowd rising into the dark, the square lighting truss with
 * its lamps and light shafts, a big screen over the ring, and camera
 * flashes popping in the stands. The lights are few and strong: one key
 * light with shadows straight down on the canvas and two hard rim lights
 * from opposite corners of the truss, so the boxers stand out from the dark.
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
    const truss = buildTruss(glow, (thing) => this.keep(thing));
    this.group.add(truss.group);
    this.shafts.push(...truss.shafts);
    this.buildScreen();
  }

  /**
   * Moves the crowd and the flashes on. `excite` is 0 calm to 1 on its
   * feet. Flashes fire more often when the crowd is excited, and all at
   * once for a knockdown.
   */
  /** The stools come into the corners between rounds, and go again for the fight. */
  setStools(visible: boolean): void {
    for (const stool of this.ring.stools) stool.visible = visible;
  }

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
    this.flashes.spawn({ x: face.x, y: face.y + 0.1, z: face.z, life: 0.12, size: 0.22 + this.random() * 0.18, color: "#f4f8ff", alpha: 1 });
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
