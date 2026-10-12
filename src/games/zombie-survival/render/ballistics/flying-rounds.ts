import * as THREE from "three";
import { flight, ROUNDS, type RoundSpec } from "../../ballistics/rounds";
import type { Impact } from "../effects/impacts";
import { put, QuadBatch } from "../effects/gpu/quad-batch";
import { STREAK_LAYOUT, streakMaterial, streakQuad, trackAspect } from "../effects/gpu/streak-material";
import { drawTime, roundPoint, tailTime } from "./arc";
import { LOOKS, roundColour, SHUTTER, type RoundKind, type RoundLook, type Rgb } from "./round-look";

/** Where a round lands and what it does there, handed back when it arrives. */
export interface Landing {
  normal: THREE.Vector3;
  impact: Impact;
  /** Also flash the hit at a size that reads from far off. */
  flash: boolean;
  /** It hit nothing, so it flies on past `to` and fades instead of stopping there. */
  miss: boolean;
}

interface Round {
  live: boolean;
  spec: RoundSpec;
  look: RoundLook;
  colour: Rgb;
  from: THREE.Vector3;
  to: THREE.Vector3;
  normal: THREE.Vector3;
  impact: Impact;
  flash: boolean;
  miss: boolean;
  length: number;
  total: number;
  t: number;
  arrived: boolean;
  drawn: boolean;
}

/** A miss flies on past its far point for this long, fading into the fog. */
const MISS_FADE = 0.18;

/**
 * Every round in the air, flying from the muzzle at its real speed with
 * drag slowing it and gravity bending it onto the hit. Each is drawn as a
 * streak blurred over a camera shutter, so a rifle round smears across
 * metres while buckshot shows as short specks. The impact waits for the
 * round: `arrive` is called when it gets there, not at the trigger pull.
 */
export class FlyingRounds {
  private readonly batch: QuadBatch;
  private readonly rounds: Round[] = [];
  private next = 0;
  private readonly head = new THREE.Vector3();
  private readonly tail = new THREE.Vector3();

  constructor(
    capacity: number,
    private readonly arrive: (at: THREE.Vector3, landing: Landing) => void,
  ) {
    const material = streakMaterial();
    this.batch = new QuadBatch(capacity, STREAK_LAYOUT, material, streakQuad());
    trackAspect(this.batch.mesh, material);
    for (let i = 0; i < capacity; i++) {
      this.rounds.push({
        live: false, spec: ROUNDS.rifle, look: LOOKS.heat, colour: { r: 1, g: 1, b: 1 },
        from: new THREE.Vector3(), to: new THREE.Vector3(), normal: new THREE.Vector3(), impact: "none", flash: false, miss: false,
        length: 0, total: 0, t: 0, arrived: false, drawn: false,
      });
    }
  }

  get mesh(): THREE.Mesh {
    return this.batch.mesh;
  }

  /** Fires one round from `from` to `to`. Returns its flight time in seconds, for anything that waits on it. */
  launch(spec: RoundSpec, kind: RoundKind, from: THREE.Vector3, to: THREE.Vector3, player: Rgb, landing: Landing): number {
    const round = this.rounds[this.next]!;
    this.next = (this.next + 1) % this.rounds.length;
    // A round still in the air when its slot is reused lands now, so no impact is ever lost.
    if (round.live && !round.arrived) this.land(round);
    round.live = true;
    round.spec = spec;
    round.look = LOOKS[kind];
    roundColour(kind, player, round.colour);
    round.from.copy(from);
    round.to.copy(to);
    round.normal.copy(landing.normal);
    round.impact = landing.impact;
    round.flash = landing.flash;
    round.miss = landing.miss;
    round.length = from.distanceTo(to);
    round.total = flight(spec, round.length).time;
    round.t = 0;
    round.arrived = false;
    round.drawn = false;
    return round.total;
  }

  update(dt: number): void {
    const { aHead, aTail, aWidth, aColor, aShape } = this.batch.data as Record<keyof typeof STREAK_LAYOUT, Float32Array>;
    this.batch.begin();
    for (const round of this.rounds) {
      if (!round.live) continue;
      round.t += dt;
      const miss = round.miss;
      const shutter = SHUTTER * round.look.blur;
      if (!round.arrived && round.t >= round.total) {
        this.land(round);
      }
      // A hit is done once its blur has caught up with it on the target. A miss once it has faded.
      const end = round.total + (miss ? MISS_FADE : shutter);
      if (round.drawn && round.t >= end) {
        round.live = false;
        continue;
      }
      const t = drawTime(round.t, round.total, round.drawn);
      const headT = miss ? t : Math.min(t, round.total);
      const tailT = miss ? tailTime(t, shutter) : Math.min(tailTime(t, shutter), round.total);
      roundPoint(round.spec, round.from, round.to, round.length, round.total, headT, this.head);
      roundPoint(round.spec, round.from, round.to, round.length, round.total, tailT, this.tail);
      round.drawn = true;
      const fade = miss && t > round.total ? Math.max(0, 1 - (t - round.total) / MISS_FADE) : 1;
      const i = this.batch.take();
      if (i < 0) continue;
      const { look, colour } = round;
      put(aHead, 3, i, this.head.x, this.head.y, this.head.z);
      put(aTail, 3, i, this.tail.x, this.tail.y, this.tail.z);
      put(aWidth, 2, i, look.head, look.tail);
      put(aColor, 4, i, colour.r, colour.g, colour.b, look.alpha * fade);
      put(aShape, 2, i, look.glow, look.falloff);
    }
    this.batch.end();
  }

  dispose(): void {
    this.batch.dispose();
  }

  private land(round: Round): void {
    round.arrived = true;
    if (!round.miss && round.impact !== "none") this.arrive(round.to, round);
  }
}
