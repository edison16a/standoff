import * as THREE from "three";
import { hash } from "../../engine/rng";
import { ZONE_LENGTH } from "../../engine/tuning";
import { GANTRY, tunnelCeilingAt } from "../models/overhead";
import { sidePiece } from "../models/sides";
import { CHUNK, gantry, signalPost, trackTile } from "../models/track";
import { portal, tunnel } from "../models/tunnel";
import { release } from "../prefabs";
import { OverheadFade } from "./overhead-fade";
import { THEMES, themeIndexAt, type SideKind } from "./themes";

/** How far ahead scenery is built. The haze hides the edge. */
const AHEAD = 190;
const BEHIND = 24;
/** Tunnels come in runs of this many chunks. */
const TUNNEL_RUN = 4;

/** What stands in one chunk, worked out from its number alone. */
export interface ChunkPlan {
  theme: number;
  tunnel: boolean;
  /** The first chunk of a tunnel, which has the portal. */
  mouth: boolean;
  left: SideKind;
  right: SideKind;
  variant: number;
  /** A signal gantry over the tracks, with a bit per track for a red light, or null for none. */
  signals: number | null;
  /** A signal on a post beside the tracks: which side, and which lamp is lit. */
  post: { side: -1 | 1; lit: number } | null;
}

/** The plan for chunk `k`. Pure and seeded, so it is the same every time the chunk is rebuilt. */
export function planChunk(k: number, seed: number): ChunkPlan {
  const start = k * CHUNK;
  const theme = themeIndexAt(start);
  const t = THEMES[theme]!;
  const run = Math.floor(k / TUNNEL_RUN);
  // No tunnel at the very start, or across a change of zone, where the new look should be seen.
  const zoneStart = Math.floor(start / ZONE_LENGTH) * ZONE_LENGTH;
  const runStart = run * TUNNEL_RUN * CHUNK;
  const fits = runStart >= zoneStart + CHUNK * 2 && runStart + TUNNEL_RUN * CHUNK <= zoneStart + ZONE_LENGTH;
  const inTunnel = k >= 6 && fits && hash(run, seed + 17) < t.tunnels * 2.2;
  const block = Math.floor(k / 3);
  const pick = (salt: number): SideKind => {
    const total = t.sides.reduce((sum, [, w]) => sum + w, 0);
    let roll = hash(block, seed * 13 + salt) * total;
    for (const [kind, weight] of t.sides) {
      roll -= weight;
      if (roll < 0) return kind;
    }
    return t.sides[0]![0];
  };
  return {
    theme,
    tunnel: inTunnel,
    mouth: inTunnel && k % TUNNEL_RUN === 0,
    left: pick(1),
    right: pick(2),
    variant: Math.floor(hash(k, seed + 5) * 4),
    signals: !inTunnel && k % 4 === 0 ? Math.floor(hash(k, seed + 9) * 8) : null,
    post: !inTunnel && k % 4 === 2 ? { side: hash(k, seed + 11) < 0.5 ? -1 : 1, lit: Math.floor(hash(k, seed + 13) * 3) } : null,
  };
}

/**
 * The scenery around one run: track, signals, fences, stations, flats,
 * trees and tunnels, laid chunk by chunk ahead of the runner and given
 * back behind. Every piece is a pooled copy of a shared prefab, so a
 * chunk costs a handful of draw calls and no new geometry.
 */
export class Scenery {
  readonly group = new THREE.Group();
  /** Fades the gantries that come between the camera and the runner. */
  readonly fade = new OverheadFade();
  private readonly chunks = new Map<number, THREE.Group>();

  constructor(private seed: number) {
    this.group.name = "scenery";
  }

  /** Starts over on another yard, for a new round in the same view. */
  reseed(seed: number): void {
    if (seed === this.seed) return;
    this.seed = seed;
    for (const k of [...this.chunks.keys()]) this.drop(k);
  }

  /** Whether the runner is inside a tunnel at this distance, for the light and the sound. */
  tunnelAt(distance: number): boolean {
    const k = Math.floor(distance / CHUNK);
    return planChunk(k, this.seed).tunnel;
  }

  /** The lowest thing over the tracks at this distance and `x`, for keeping the camera under it. */
  ceilingAt(distance: number, x: number): number {
    return this.tunnelAt(distance) ? tunnelCeilingAt(x) : Infinity;
  }

  update(distance: number): void {
    const first = Math.floor((distance - BEHIND) / CHUNK);
    const last = Math.floor((distance + AHEAD) / CHUNK);
    for (const k of [...this.chunks.keys()]) if (k < first || k > last) this.drop(k);
    // Two chunks before the start, so the camera behind the runner never sees the edge of the world.
    for (let k = Math.max(-2, first); k <= last; k++) if (!this.chunks.has(k)) this.build(k);
  }

  private build(k: number): void {
    const plan = planChunk(k, this.seed);
    const theme = THEMES[plan.theme]!;
    const chunk = new THREE.Group();
    chunk.position.z = -k * CHUNK;
    chunk.add(trackTile(theme));
    if (plan.tunnel) {
      chunk.add(tunnel());
      if (plan.mouth) chunk.add(portal());
    } else {
      chunk.add(sidePiece(plan.left, -1, plan.variant, theme, plan.theme));
      chunk.add(sidePiece(plan.right, 1, plan.variant + 1, theme, plan.theme));
      if (plan.post) {
        const post = signalPost(plan.post.side, plan.post.lit);
        post.position.z = -12;
        chunk.add(post);
      }
      if (plan.signals !== null) {
        const frame = gantry(plan.signals);
        frame.position.z = -2;
        const z = -k * CHUNK - 2;
        this.fade.adopt(frame, { near: z + GANTRY.depth / 2, far: z - GANTRY.depth / 2, low: GANTRY.low, high: GANTRY.high });
        chunk.add(frame);
      }
    }
    chunk.updateMatrixWorld(true);
    this.chunks.set(k, chunk);
    this.group.add(chunk);
  }

  /** Gives a chunk's pieces back to the pool. */
  private drop(k: number): void {
    const chunk = this.chunks.get(k);
    if (!chunk) return;
    for (const piece of [...chunk.children]) {
      this.fade.drop(piece);
      release(piece);
    }
    chunk.removeFromParent();
    this.chunks.delete(k);
  }

  dispose(): void {
    for (const k of [...this.chunks.keys()]) this.drop(k);
    this.fade.clear();
  }
}
