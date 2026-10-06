import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import type { NetsView } from "../../engine/net-view";
import { TEAMS } from "../../teams";
import { Boards } from "./boards";
import { Crowd } from "./crowd";
import { buildDugouts } from "./dugouts";
import { Floodlights } from "./floodlights";
import { GoalModel } from "./goal-model";
import { stadiumLights } from "./lighting";
import { buildPitch } from "./pitch";
import { buildSky } from "./sky";
import { buildStands } from "./stands";
import { blobTexture, netTexture } from "./textures";

/**
 * The whole ground under the floodlights: pitch, boards, goals, the
 * roofed bowl of stands full of fans, the towers, the sky, and the
 * lights that make the kits and the turf read like a night match on
 * television.
 */
export class Arena {
  readonly group = new THREE.Group();
  readonly boards = new Boards();
  readonly goals: [GoalModel, GoalModel];
  readonly crowd: Crowd;
  readonly key: THREE.DirectionalLight;
  readonly ambient: THREE.HemisphereLight;
  readonly glow: THREE.CanvasTexture;
  private readonly towers = new Floodlights();
  private readonly net: THREE.CanvasTexture;
  private readonly parts: { dispose(): void }[] = [];

  constructor(lite = false) {
    this.glow = blobTexture();
    this.net = netTexture();
    const pitch = buildPitch();
    const stands = buildStands();
    const sky = buildSky();
    this.goals = [new GoalModel(-1, this.net), new GoalModel(1, this.net)];
    const colours = [TEAMS[0].kit.shirt, TEAMS[1].kit.shirt] as const;
    this.crowd = new Crowd(stands.seats, colours);
    const dugouts = buildDugouts(colours);
    this.parts.push(pitch, stands, dugouts, this.towers, sky, this.boards, ...this.goals, this.crowd);
    this.group.add(sky.group, pitch.group, stands.group, dugouts.group, this.towers.group, this.boards.group, this.goals[0].group, this.goals[1].group);
    // Thousands of fans are the heaviest thing to draw; software graphics in tests leave them out.
    if (!lite) this.group.add(this.crowd.mesh);
    this.group.add(this.catchNets());
    const lights = stadiumLights(!lite);
    this.key = lights.key;
    this.ambient = lights.ambient;
    this.group.add(lights.group);
  }

  /** A tall, fine catch net behind each goal on thin poles. */
  private catchNets(): THREE.Group {
    const group = new THREE.Group();
    const map = this.net.clone();
    map.repeat.set(90, 24);
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, color: "#c9ced8" });
    const poles = new THREE.MeshStandardMaterial({ color: "#3c4048", metalness: 0.5, roughness: 0.5 });
    const W = PITCH.halfWidth * 2;
    const geometries: THREE.BufferGeometry[] = [];
    for (const end of [-1, 1]) {
      const sheet = new THREE.PlaneGeometry(W, 7);
      geometries.push(sheet);
      const net = new THREE.Mesh(sheet, material);
      net.rotation.y = Math.PI / 2;
      net.position.set(end * (PITCH.halfLength + PITCH.catchNet), 3.5, 0);
      group.add(net);
      for (const z of [-W / 2, 0, W / 2]) {
        const rod = new THREE.CylinderGeometry(0.04, 0.04, 7, 6);
        geometries.push(rod);
        const pole = new THREE.Mesh(rod, poles);
        pole.position.set(end * (PITCH.halfLength + PITCH.catchNet), 3.5, z);
        group.add(pole);
      }
    }
    this.parts.push(map, material, poles, ...geometries);
    return group;
  }

  /** Each frame: the boards, the fans, the nets and the glare for where `camera` stands. */
  update(nets: NetsView, dt: number, time: number, camera: THREE.Camera): void {
    this.boards.update(dt, time);
    this.crowd.update(dt, time);
    this.goals[0].update(nets[0], dt);
    this.goals[1].update(nets[1], dt);
    this.towers.update(camera);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
    this.glow.dispose();
    this.net.dispose();
  }
}
