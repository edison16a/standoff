import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Slot } from "@/games/blade-clash/players";
import { disposeOwned, MeshBuilder } from "../kit/mesh-builder";
import { seeded } from "../kit/textures";
import { FESTIVE, PLAYER_COLOURS } from "../player-colours";
import type { HallTheme } from "./hall-theme";

const ROWS = 7;
const ROW_DEPTH = 0.86;
const RISE = 0.42;
const FRONT = -5.2;
const HALF_WIDTH = 15;
const SEAT_GAP = 0.62;

interface Fan {
  seat: THREE.Vector3;
  /** Which fencer they came for, if anyone. Their side cheers hardest. */
  side: Slot | null;
  phase: number;
  delay: number;
}

const SKIN = [0xf1c6a6, 0xd9a47e, 0xa8714a, 0x6d4630];
const NEUTRAL = [0x2b2d42, 0xe9ecef, 0x6c757d, 0x1d3557, 0x8d99ae];

/**
 * Tiered stands behind the strip, full of people. Everyone is one of three
 * instanced meshes (body, head, arms), so a few hundred fans cost three draw
 * calls. They sway while they watch, and on a touch they jump up with their
 * arms in the air, the scorer's supporters highest.
 */
export class Stands {
  readonly group = new THREE.Group();
  private readonly fans: Fan[] = [];
  private readonly bodies: THREE.InstancedMesh;
  private readonly heads: THREE.InstancedMesh;
  private readonly arms: THREE.InstancedMesh;
  private cheer = { at: -Infinity, side: null as Slot | null, strength: 0 };
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3(1, 1, 1);
  private readonly p = new THREE.Vector3();

  constructor(theme: HallTheme) {
    const rand = seeded(1234);
    const steps = new MeshBuilder();
    const concrete = new THREE.MeshStandardMaterial({ color: theme.dark ? 0x1c1e2a : 0x8d8578, roughness: 0.9 });
    const seatMaterial = new THREE.MeshStandardMaterial({ color: theme.seats, roughness: 0.5 });
    for (let row = 0; row < ROWS; row++) {
      const z = FRONT - row * ROW_DEPTH;
      const height = 0.3 + row * RISE;
      steps.box(HALF_WIDTH * 2, height, ROW_DEPTH, concrete, [0, height / 2, z - ROW_DEPTH / 2]);
    }
    this.group.add(steps.build("stands", false));

    const seatGeo = mergeGeometries([new THREE.BoxGeometry(0.46, 0.08, 0.4).translate(0, 0.04, 0), new THREE.BoxGeometry(0.46, 0.42, 0.06).translate(0, 0.25, -0.2)]);
    const seats = new THREE.InstancedMesh(seatGeo!, seatMaterial, ROWS * Math.ceil((HALF_WIDTH * 2) / SEAT_GAP));
    let seatCount = 0;
    for (let row = 0; row < ROWS; row++) {
      const z = FRONT - row * ROW_DEPTH - ROW_DEPTH * 0.45;
      const y = 0.3 + row * RISE;
      for (let x = -HALF_WIDTH + 0.5; x < HALF_WIDTH - 0.4; x += SEAT_GAP) {
        const seat = new THREE.Vector3(x + (row % 2) * 0.2, y, z);
        this.m.makeTranslation(seat.x, seat.y, seat.z);
        seats.setMatrixAt(seatCount++, this.m);
        if (rand() < 0.84) {
          const r = rand();
          this.fans.push({ seat, side: r < 0.25 ? 1 : r < 0.5 ? 2 : null, phase: rand() * Math.PI * 2, delay: rand() * 280 });
        }
      }
    }
    seats.count = seatCount;
    this.group.add(seats);

    const cloth = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const skin = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    this.bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10).scale(1.05, 1, 0.7), cloth, this.fans.length);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 10), skin, this.fans.length);
    const armGeo = mergeGeometries([-0.2, 0.2].map((x) => new THREE.CapsuleGeometry(0.045, 0.42, 3, 6).translate(x, -0.24, 0)));
    this.arms = new THREE.InstancedMesh(armGeo!, cloth, this.fans.length);
    const colour = new THREE.Color();
    this.fans.forEach((fan, i) => {
      const shirt = fan.side ? PLAYER_COLOURS[fan.side] : rand() < 0.5 ? FESTIVE[Math.floor(rand() * FESTIVE.length)]! : NEUTRAL[Math.floor(rand() * NEUTRAL.length)]!;
      colour.set(shirt).lerp(new THREE.Color(0x777777), 0.38).multiplyScalar(theme.crowdLight);
      this.bodies.setColorAt(i, colour);
      this.arms.setColorAt(i, colour);
      colour.set(SKIN[Math.floor(rand() * SKIN.length)]!).multiplyScalar(theme.crowdLight);
      this.heads.setColorAt(i, colour);
    });
    for (const mesh of [this.bodies, this.heads, this.arms]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.update(0);
  }

  /** The crowd erupts: `side` is the scorer, whose fans cheer hardest. */
  roar(t: number, side: Slot | null, strength = 1): void {
    this.cheer = { at: t, side, strength };
  }

  update(t: number): void {
    const since = t - this.cheer.at;
    this.fans.forEach((fan, i) => {
      const local = since - fan.delay;
      const partisan = this.cheer.side === null || fan.side === null ? 0.7 : fan.side === this.cheer.side ? 1 : 0.15;
      const excite = local > 0 ? Math.max(0, 1 - local / 2600) * this.cheer.strength * partisan : 0;
      const bounce = excite > 0 ? Math.abs(Math.sin(local / 150 + fan.phase)) * 0.12 * excite : 0;
      const sway = Math.sin(t / 900 + fan.phase) * 0.02;
      const rise = Math.min(1, excite * 2.5) * 0.3 + bounce;
      const { seat } = fan;
      this.set(this.bodies, i, seat.x + sway, seat.y + 0.38 + rise, seat.z, sway * 2, 0);
      this.set(this.heads, i, seat.x + sway * 1.5, seat.y + 0.72 + rise, seat.z + 0.01, 0, 0);
      const lift = Math.min(1, excite * 3) * (2.7 + Math.sin(local / 120 + fan.phase) * 0.25);
      this.set(this.arms, i, seat.x + sway, seat.y + 0.56 + rise, seat.z + 0.02, 0, -lift + 0.15);
    });
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    this.arms.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    disposeOwned(this.group);
  }

  private set(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, roll: number, pitch: number): void {
    this.q.setFromEuler(this.e.set(pitch, 0, roll));
    this.m.compose(this.p.set(x, y, z), this.q, this.s);
    mesh.setMatrixAt(i, this.m);
  }
}
