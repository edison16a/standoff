import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import type { BallView } from "../../engine/view";
import { TEAMS } from "../../teams";
import { Boards } from "./boards";
import { Crowd } from "./crowd";
import { buildFloodlights } from "./floodlights";
import { GoalModel } from "./goal-model";
import { buildPitch } from "./pitch";
import { buildSky } from "./sky";
import { buildStands } from "./stands";
import { blobTexture, netTexture } from "./textures";

/**
 * The whole ground under the floodlights: pitch, boards, goals, stands
 * full of fans, the towers, the sky, and the lights that make the kits
 * and the turf read like a night match on television.
 */
export class Arena {
  readonly group = new THREE.Group();
  readonly boards = new Boards();
  readonly goals: [GoalModel, GoalModel];
  readonly crowd: Crowd;
  readonly key: THREE.DirectionalLight;
  readonly glow: THREE.CanvasTexture;
  private readonly net: THREE.CanvasTexture;
  private readonly parts: { dispose(): void }[] = [];

  constructor(lite = false) {
    this.glow = blobTexture();
    this.net = netTexture();
    const pitch = buildPitch();
    const stands = buildStands();
    const lights = buildFloodlights(this.glow, !lite);
    const sky = buildSky();
    this.goals = [new GoalModel(-1, this.net), new GoalModel(1, this.net)];
    this.crowd = new Crowd(stands.seats, [TEAMS[0].kit.shirt, TEAMS[1].kit.shirt]);
    this.parts.push(pitch, stands, lights, sky, this.boards, ...this.goals, this.crowd);
    this.group.add(sky.group, pitch.group, stands.group, lights.group, this.boards.group, this.goals[0].group, this.goals[1].group);
    // Thousands of fans are the heaviest thing to draw; software graphics in tests leave them out.
    if (!lite) this.group.add(this.crowd.mesh);
    this.group.add(this.catchNets());

    this.group.add(new THREE.HemisphereLight("#9fb2ff", "#10281a", 0.42));
    // The key light comes from high on the camera's side, so the faces the broadcast sees are lit.
    this.key = new THREE.DirectionalLight("#fff4e2", 2.4);
    this.key.position.set(-14, 34, 22);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const cam = this.key.shadow.camera;
    // Wide enough for the whole pitch and its boards.
    cam.left = -(PITCH.halfLength + 8);
    cam.right = PITCH.halfLength + 8;
    cam.top = PITCH.halfWidth + 8;
    cam.bottom = -(PITCH.halfWidth + 8);
    cam.near = 5;
    cam.far = 90;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.02;
    const fill = new THREE.DirectionalLight("#cfdcff", 0.7);
    fill.position.set(18, 26, -20);
    const rim = new THREE.DirectionalLight("#ffe9c7", 0.7);
    rim.position.set(20, 22, 18);
    this.group.add(this.key, this.key.target, fill, rim);
  }

  /** Tall catch nets behind each goal, and a light cage net along the far side. */
  private catchNets(): THREE.Group {
    const group = new THREE.Group();
    const map = this.net.clone();
    map.repeat.set(60, 20);
    const material = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, color: "#d8dde8" });
    const poles = new THREE.MeshStandardMaterial({ color: "#6b707a", metalness: 0.5, roughness: 0.5 });
    const W = PITCH.halfWidth * 2;
    for (const end of [-1, 1]) {
      const net = new THREE.Mesh(new THREE.PlaneGeometry(W, 7), material);
      net.rotation.y = Math.PI / 2;
      net.position.set(end * (PITCH.halfLength + PITCH.catchNet), 3.5, 0);
      group.add(net);
      for (const z of [-W / 2, -W / 4, 0, W / 4, W / 2]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 7, 8), poles);
        pole.position.set(end * (PITCH.halfLength + PITCH.catchNet), 3.5, z);
        group.add(pole);
      }
    }
    const far = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.halfLength * 2 + 7, 4), material);
    far.position.set(0, PITCH.boardHeight + 2, -PITCH.halfWidth - 0.15);
    group.add(far);
    this.parts.push(map, material, poles, { dispose: () => group.traverse((o) => (o as THREE.Mesh).geometry?.dispose()) });
    return group;
  }

  update(ball: BallView, dt: number, time: number): void {
    this.boards.update(dt, time);
    this.crowd.update(dt, time);
    for (const goal of this.goals) goal.update(ball, dt);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
    this.glow.dispose();
    this.net.dispose();
  }
}
