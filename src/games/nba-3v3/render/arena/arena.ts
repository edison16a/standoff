import * as THREE from "three";
import { TEAMS } from "../../roster";
import { suitesTexture } from "../textures";
import { Jumbotron } from "./jumbotron";
import { LedBoards } from "./led-boards";
import { Roof } from "./roof";
import { Crowd } from "./crowd";
import { Floor } from "./floor";
import { FloorMirror } from "./floor-mirror";
import { Hoop } from "./hoop";
import { ArenaLights } from "./lighting";
import { layoutSeats } from "./seat-layout";
import { Stands } from "./stands";

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
  private readonly stands: Stands;
  readonly lights = new ArenaLights();
  readonly key = this.lights.key;
  readonly fill = this.lights.fill;
  readonly rim = this.lights.rim;
  private readonly boards = new LedBoards();
  /** The scrolling LED ribbons, which the showcase's trailer hides because they carry words. */
  readonly ribbons = this.boards.group;
  private readonly textures: THREE.Texture[] = [];
  private readonly owned: THREE.Material[] = [];

  /** The floor's reflection of the players and lights, drawn before each frame. */
  readonly mirror: FloorMirror;
  readonly floor: Floor;
  readonly jumbotron: Jumbotron;
  private readonly roof: Roof;

  /** `mirror` is the reflection's size as a share of the picture's; 0 leaves the floor with the environment map alone. */
  constructor(mirror = 0.5, beams = true) {
    this.mirror = new FloorMirror(mirror);
    this.floor = new Floor(mirror > 0 ? this.mirror : null);
    this.group.add(this.floor.mesh);
    // Dark floor beyond the painted apron, out to the stands.
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: "#0a0d1f", roughness: 0.6 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.01;
    outer.receiveShadow = true;
    this.group.add(outer);
    this.mirror.hidden.push(this.floor.mesh, outer);

    const sections = [
      { x: 0, z: -5.2, yaw: 0, width: 34, rows: 16 },
      { x: -11.8, z: 6, yaw: Math.PI / 2, width: 24, rows: 14 },
      { x: 11.8, z: 6, yaw: -Math.PI / 2, width: 24, rows: 14 },
    ];
    const { seats, aisles } = layoutSeats(sections);
    this.stands = new Stands(sections, seats, aisles);
    this.crowd = new Crowd(seats);
    this.group.add(this.stands.group, this.crowd.group);
    this.mirror.hidden.push(this.stands.group);
    this.group.add(this.ribbons);
    this.bowl();
    this.mirror.hidden.push(this.crowd.group);
    this.group.add(this.hoop.group);

    this.roof = new Roof(beams);
    this.jumbotron = new Jumbotron(this.boards.texture);
    this.group.add(this.roof.group, this.jumbotron.group, this.lights.group);
    this.mirror.hidden.push(this.roof.group, this.jumbotron.group);
  }

  /** The bowl: a dark wall rising behind the stands, and the upper deck of suites. */
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
    const deckMat = new THREE.MeshBasicMaterial({ map: suites, side: THREE.BackSide, color: "#7a8096", toneMapped: false });
    this.owned.push(deckMat);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(27, 27, 5.5, 64, 1, true, Math.PI * 0.5, Math.PI * 1.4), deckMat);
    deck.position.set(0, 10.2, 6);
    this.group.add(deck);
    this.mirror.hidden.push(wall, deck);
  }

  /**
   * The last resort for a slow card, once the picture is already at its
   * fewest pixels: the floor's mirror (a second drawing of the scene)
   * and the haze beams go, and the floor keeps its environment gloss.
   */
  shed(): void {
    this.mirror.off();
    this.roof.dropBeams();
  }

  /** Draws the floor's reflection for this frame's camera; the shadows must already be drawn. */
  reflect(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.mirror.render(renderer, scene, camera);
    this.floor.update();
  }

  update(dt: number, time: number, ball: { x: number; y: number; z: number }, calm: number): void {
    this.boards.update(time);
    this.crowd.update(dt, time, calm);
    this.hoop.update(dt, time, ball);
  }

  dispose(): void {
    this.hoop.dispose();
    this.crowd.dispose();
    this.stands.dispose();
    this.floor.dispose();
    this.mirror.dispose();
    for (const t of this.textures) t.dispose();
    this.boards.dispose();
    this.roof.dispose();
    this.jumbotron.dispose();
    for (const m of this.owned) m.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) o.geometry.dispose();
    });
  }
}
