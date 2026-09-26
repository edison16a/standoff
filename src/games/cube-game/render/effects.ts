import * as THREE from "three";
import type { PlayerEvent, PlayerState } from "../engine/player";
import type { Skin } from "./avatar";
import { Debris } from "./debris";
import { Particles } from "./particles";
import { MODE_COLOURS } from "./themes";

/** How bright a rival's sparks are in the other player's view, like its ghost. */
const RIVAL_SPARKS = 0.3;
/** One spark pool per player, so each view can dim the rival's. */
const PLAYERS = 2;
const RING_LIFE = 0.45;

/**
 * The sparks: each player's trail, bursts at pads, orbs and portals, a
 * puff on landing, and the crash, which throws cube shards and a ring of
 * light. All of it lives in the world, so both halves of a split screen
 * see a rival's crash if it is in view. Each player's sparks are their own
 * pool, and a view dims the rival's: two runs on the same beats would
 * otherwise stack their trails into one white glare.
 */
export class Effects {
  readonly group = new THREE.Group();
  private readonly pools = Array.from({ length: PLAYERS }, () => new Particles());
  private readonly lastX: (number | null)[] = Array.from({ length: PLAYERS }, () => null);
  private readonly debris = new Debris();
  private readonly rings: { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; life: number; player: number }[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.8, 1, 48);
  private readonly colour = new THREE.Color();
  private seed = 1;

  constructor() {
    this.group.add(...this.pools.map((pool) => pool.points), this.debris.mesh);
  }

  /** Points get this big per block of distance, so they match the view's size in pixels. */
  setScale(pixelsPerUnitAtOne: number): void {
    for (const pool of this.pools) pool.setScale(pixelsPerUnitAtOne);
  }

  /** Before drawing a view: its own player's sparks full, the rival's dimmed. */
  focus(player: number): void {
    this.pools.forEach((pool, i) => pool.setFade(i === player ? 1 : RIVAL_SPARKS));
    for (const ring of this.rings) ring.mesh.material.opacity = (ring.life / RING_LIFE) * (ring.player === player ? 1 : RIVAL_SPARKS);
  }

  private pool(player: number): Particles {
    return this.pools[player] ?? this.pools[0]!;
  }

  /** Repeatable randomness, so the showcase plays the same on every capture. */
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  trail(player: number, state: PlayerState, skin: Skin, dt: number): void {
    const last = this.lastX[player] ?? null;
    this.lastX[player] = state.x;
    // A run waiting for its start stands still, and a trail would pile up into a glowing blob behind it.
    if (state.dead || state.finished || last === null || Math.abs(state.x - last) < 1e-3) return;
    const count = Math.min(3, Math.ceil(dt * 90));
    for (let i = 0; i < count; i++) {
      const behind = state.mode === "ufo" ? -0.2 : 0.46 * state.gravity;
      this.pool(player).spawn({
        x: state.x - 0.45,
        y: state.y - behind * (state.mode === "ufo" ? 1 : 0.8) + (this.random() - 0.5) * 0.3,
        vx: -1 - this.random() * 2,
        vy: (this.random() - 0.5) * 1.2,
        life: 0.35 + this.random() * 0.25,
        size: 0.22 + this.random() * 0.14,
        colour: this.colour.set(i % 2 ? skin.trim : skin.main),
        drag: 1.5,
      });
    }
  }

  /** Sparks for whatever just happened to a player. */
  event(player: number, event: PlayerEvent, state: PlayerState, skin: Skin): void {
    const pool = this.pool(player);
    switch (event.type) {
      case "death":
        this.explode(player, event.x, event.y, skin);
        break;
      case "land":
        this.burst(pool, state.x, state.y - 0.46 * state.gravity, 0xffffff, 6, 3, 0.25);
        break;
      case "pad":
        this.burst(pool, event.x + 0.5, event.y, 0xffe14d, 16, 7, 0.4);
        break;
      case "orb":
        this.burst(pool, event.x, event.y, 0xffd21f, 22, 8, 0.45);
        this.ring(player, event.x, event.y, 0xffd21f);
        break;
      case "portal":
        this.burst(pool, state.x, state.y, MODE_COLOURS[event.mode], 40, 10, 0.6);
        this.ring(player, state.x, state.y, MODE_COLOURS[event.mode]);
        break;
      case "finish":
        for (let i = 0; i < 5; i++) this.burst(pool, state.x + 2 + i, 2 + this.random() * 6, [0xff4fd8, 0x3ee6ff, 0xffe14d, 0x3dff6e, 0xff8a3d][i]!, 30, 9, 1.1);
        break;
      default:
    }
  }

  private burst(pool: Particles, x: number, y: number, hex: number, count: number, speed: number, life: number): void {
    this.colour.set(hex);
    for (let i = 0; i < count; i++) {
      const angle = this.random() * Math.PI * 2;
      const v = speed * (0.4 + this.random() * 0.6);
      pool.spawn({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, vz: (this.random() - 0.5) * v, life: life * (0.6 + this.random() * 0.6), size: 0.3, colour: this.colour, drag: 2.5 });
    }
  }

  private ring(player: number, x: number, y: number, hex: number): void {
    const mesh = new THREE.Mesh(this.ringGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(2.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.position.set(x, y, 0.2);
    this.group.add(mesh);
    this.rings.push({ mesh, life: RING_LIFE, player });
  }

  private explode(player: number, x: number, y: number, skin: Skin): void {
    const pool = this.pool(player);
    this.burst(pool, x, y, skin.trim, 50, 14, 0.7);
    this.burst(pool, x, y, 0xffffff, 20, 9, 0.35);
    this.ring(player, x, y, skin.trim);
    this.debris.crash(x, y, skin, () => this.random());
  }

  update(dt: number): void {
    for (const pool of this.pools) pool.update(dt);
    this.debris.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.life -= dt;
      if (ring.life <= 0) {
        this.group.remove(ring.mesh);
        ring.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      ring.mesh.scale.setScalar(0.5 + (RING_LIFE - ring.life) * 7);
      ring.mesh.material.opacity = ring.life / RING_LIFE;
    }
  }

  clear(): void {
    for (const pool of this.pools) pool.clear();
    this.lastX.fill(null);
    this.debris.clear();
  }

  dispose(): void {
    for (const pool of this.pools) pool.dispose();
    this.debris.dispose();
    this.ringGeometry.dispose();
    for (const ring of this.rings) ring.mesh.material.dispose();
  }
}
