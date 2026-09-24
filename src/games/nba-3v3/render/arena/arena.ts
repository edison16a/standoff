import * as THREE from "three";
import { TEAMS } from "../../roster";
import { ledTexture, suitesTexture } from "../textures";
import { Crowd } from "./crowd";
import { FLOOR, floorTexture } from "./floor-texture";
import { Hoop } from "./hoop";

/**
 * The arena around the court: the glossy floor, the stands packed with
 * fans on three sides, scrolling LED boards along the front rows, a dark
 * bowl with lights up in the rafters, and the lighting rig that puts the
 * court in a bright pool with soft shadows under every player.
 */
export class Arena {
  readonly group = new THREE.Group();
  readonly hoop = new Hoop();
  readonly crowd: Crowd;
  readonly key: THREE.DirectionalLight;
  private readonly leds: THREE.Texture[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly owned: THREE.Material[] = [];

  constructor() {
    const floorMap = floorTexture();
    const floorMat = new THREE.MeshStandardMaterial({ map: floorMap, roughness: 0.28, metalness: 0.05 });
    this.owned.push(floorMat);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR.maxX - FLOOR.minX, FLOOR.maxZ - FLOOR.minZ), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((FLOOR.maxX + FLOOR.minX) / 2, 0, (FLOOR.maxZ + FLOOR.minZ) / 2);
    floor.receiveShadow = true;
    this.group.add(floor);
    // Dark floor beyond the painted apron, out to the stands.
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: "#0a0d1f", roughness: 0.6 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.01;
    outer.receiveShadow = true;
    this.group.add(outer);

    this.crowd = new Crowd([
      { x: 0, z: -5.2, yaw: 0, width: 34, rows: 16 },
      { x: -11.8, z: 6, yaw: Math.PI / 2, width: 24, rows: 14 },
      { x: 11.8, z: 6, yaw: -Math.PI / 2, width: 24, rows: 14 },
    ]);
    this.group.add(this.crowd.group);
    this.boards();
    this.bowl();
    this.group.add(this.hoop.group);

    const hemi = new THREE.HemisphereLight("#cfe0ff", "#3a2616", 0.9);
    this.group.add(hemi);
    this.key = new THREE.DirectionalLight("#fff4e6", 2.6);
    this.key.position.set(5, 22, 14);
    this.key.target.position.set(0, 0, 4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const cam = this.key.shadow.camera;
    cam.left = -11;
    cam.right = 11;
    cam.top = 12;
    cam.bottom = -10;
    cam.near = 5;
    cam.far = 50;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 3;
    this.group.add(this.key, this.key.target);
    // A cool rim light from behind the basket separates the players from the floor.
    const back = new THREE.DirectionalLight("#9cc3ff", 1.1);
    back.position.set(-6, 10, -12);
    this.group.add(back);
  }

  /** LED ribbons along the front of each stand, scrolling. */
  private boards(): void {
    const words = ["NBA 3V3", "STANDOFF", TEAMS[0].name.toUpperCase(), "FIRST TO 11", TEAMS[1].name.toUpperCase(), "LET'S GO"];
    const tex = ledTexture(words, [TEAMS[0].color, "#ffffff", TEAMS[1].color, "#facc15"]);
    this.leds.push(tex);
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    this.owned.push(mat);
    const strip = (w: number, x: number, z: number, yaw: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.7), mat);
      m.position.set(x, 0.42, z);
      m.rotation.y = yaw;
      this.group.add(m);
    };
    tex.repeat.set(2, 1);
    strip(34, 0, -4.75, 0);
    strip(24, -11.35, 6, Math.PI / 2);
    strip(24, 11.35, 6, -Math.PI / 2);
  }

  /** The bowl: a dark wall rising behind the stands with rows of lights and a glowing ring. */
  private bowl(): void {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(34, 34, 30, 48, 1, true, Math.PI * 0.5, Math.PI * 1.4),
      new THREE.MeshBasicMaterial({ color: "#070914", side: THREE.BackSide }),
    );
    wall.position.set(0, 12, 6);
    this.group.add(wall);
    // The upper deck sits just behind the last rows, so wide shots show a full house.
    const suites = suitesTexture([TEAMS[0].color, TEAMS[1].color, "#facc15", TEAMS[0].color, TEAMS[1].color, "#f8fafc"]);
    suites.repeat.set(3, 1);
    this.textures.push(suites);
    const deckMat = new THREE.MeshBasicMaterial({ map: suites, side: THREE.BackSide, color: "#aab0c4", toneMapped: false });
    this.owned.push(deckMat);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(27, 27, 5.5, 64, 1, true, Math.PI * 0.5, Math.PI * 1.4), deckMat);
    deck.position.set(0, 10.2, 6);
    this.group.add(deck);
    const dots: number[] = [];
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        if (Math.sin(a) > 0.55) continue;
        dots.push(Math.cos(a) * (30 - ring), 11 + ring * 2.6, Math.sin(a) * (30 - ring) + 6);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(dots, 3));
    const lights = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#fff1c7", size: 0.35, sizeAttenuation: true, toneMapped: false }));
    this.group.add(lights);
  }

  update(dt: number, time: number, ball: { x: number; y: number; z: number }, calm: number): void {
    for (const t of this.leds) t.offset.x = (time * 0.035) % 1;
    this.crowd.update(dt, time, calm);
    this.hoop.update(dt, time, ball);
  }

  dispose(): void {
    this.hoop.dispose();
    this.crowd.dispose();
    for (const t of [...this.leds, ...this.textures]) t.dispose();
    for (const m of this.owned) m.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
