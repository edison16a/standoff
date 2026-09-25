import * as THREE from "three";
import { moveOf, type Move } from "../engine/moves";
import type { Fighter } from "../engine/types";
import { timing, type TrailAnchor } from "./anim/strike";
import { STYLES } from "./anim/styles";
import { FX } from "./colors";
import type { Effects } from "./effects/effects";
import { Ribbon } from "./effects/ribbon";
import type { Rig } from "./models/rig";
import { STAFF_GEM } from "./models/mage";
import { KATANA } from "./models/samurai";

const point = new THREE.Vector3();

/** A launch at least this fast, in metres per second, leaves a streak behind the fighter. */
const TRAIL_SPEED = 7;

/**
 * The motion a fighter leaves behind: the arc of a fist, foot or blade
 * while a move is live, the streak and smoke behind a fighter flung by
 * a hit, embers during an ult, and a mark where each big hitbox of a
 * special or ult comes out, so even a miss reads on screen.
 */
export class FighterTrails {
  readonly group = new THREE.Group();
  private readonly swing = new Ribbon(24, 0.16, 0.16);
  private readonly flight = new Ribbon(40, 0.5, 0.45);
  private readonly anchors: Record<Exclude<TrailAnchor, "none">, [THREE.Object3D, THREE.Vector3]>;
  private readonly fx: Effects;
  private marked = new Set<number>();
  private swingId = -1;
  private smokeAt = 0;

  constructor(
    private readonly f: Fighter,
    colour: string,
    rig: Rig,
    fx: Effects,
  ) {
    this.fx = fx;
    this.swing.setColour(FX[f.character].trail);
    this.flight.setColour(colour);
    const j = rig.joints;
    const tip = f.character === "samurai" ? new THREE.Vector3(0, -0.04, KATANA.tip + 0.1) : f.character === "mage" ? new THREE.Vector3(0, STAFF_GEM.y, 0.02) : new THREE.Vector3(0, -0.08, 0);
    this.anchors = {
      handR: [j.handR, new THREE.Vector3(0, -0.08, 0)],
      handL: [j.handL, new THREE.Vector3(0, -0.08, 0)],
      ankleR: [j.ankleR, new THREE.Vector3(0, -0.04, 0.16)],
      ankleL: [j.ankleL, new THREE.Vector3(0, -0.04, 0.16)],
      tip: [j.handR, tip],
    };
    this.group.add(this.swing.mesh, this.flight.mesh);
  }

  update(f: Fighter, x: number, y: number, time: number, height: number): void {
    if (f.action === "attack" && f.move) {
      const move = moveOf(f.character, f.move);
      const anchor = STYLES[f.character].moves[f.move].trail ?? "none";
      const t = timing(move);
      if (anchor !== "none" && f.frame >= t.from - 2 && f.frame <= t.to + 1) {
        const [bone, offset] = this.anchors[anchor];
        bone.localToWorld(point.copy(offset));
        this.swing.push(point.x, point.y, 0.3, time);
      }
      this.markHitboxes(f, move, x, y);
      if (f.move === "ult") this.fx.aura(x, y, height, FX[f.character].aura, 3);
    }
    const speed = Math.hypot(f.launch.x, f.launch.y);
    if (f.action === "hurt" && speed > TRAIL_SPEED) {
      this.flight.push(x, y + height * 0.5, -0.2, time);
      if (time - this.smokeAt > 0.04) {
        this.smokeAt = time;
        this.fx.smoke(x, y + height * 0.5);
      }
    }
    this.swing.update(time);
    this.flight.update(time);
  }

  /** Big hitboxes and every ult hitbox flash where they come out, once per group per swing. */
  private markHitboxes(f: Fighter, move: Move, x: number, y: number): void {
    if (f.swing !== this.swingId) {
      this.swingId = f.swing;
      this.marked.clear();
    }
    for (const b of move.hitboxes) {
      const group = b.group ?? 0;
      if (this.marked.has(group) || f.frame < b.from || f.frame > b.to) continue;
      if (b.r < 0.95 && f.move !== "ult") continue;
      this.marked.add(group);
      for (const box of move.hitboxes) {
        if ((box.group ?? 0) !== group) continue;
        this.mark(move, x + box.x * f.facing, y + box.y, box.r);
      }
    }
  }

  private mark(move: Move, x: number, y: number, r: number): void {
    const colour = FX[this.f.character].aura;
    const pulses = this.fx.pulses;
    if (move.sound === "slash") {
      for (const angle of [0.7, -0.7]) pulses.spawn({ kind: "streak", x, y, colour: "#ffffff", from: r * 2.2, to: r * 2.8, life: 0.2, thin: 0.06, angle });
      pulses.spawn({ kind: "streak", x, y, colour, from: r * 2.4, to: r * 3, life: 0.25, thin: 0.12, angle: 0.7 });
    } else if (move.sound === "magic") {
      pulses.spawn({ kind: "ring", x, y, colour, from: r * 0.6, to: r * 2.1, life: 0.3, opacity: 0.65 });
      pulses.spawn({ kind: "star", x, y, colour: "#f5d0fe", from: r * 0.6, to: r * 1.2, life: 0.18, spin: 3, opacity: 0.8 });
    } else if (move.sound === "slam") {
      pulses.spawn({ kind: "ring", x, y, colour, from: r * 0.5, to: r * 2.4, life: 0.4, thin: 0.45 });
      this.fx.dust(x, y - 0.3, 14);
    } else {
      pulses.spawn({ kind: "star", x, y, colour, from: r * 0.8, to: r * 1.5, life: 0.16, spin: 4 });
    }
  }

  reset(): void {
    this.swing.clear();
    this.flight.clear();
    this.swing.update(0);
    this.flight.update(0);
  }

  dispose(): void {
    this.swing.dispose();
    this.flight.dispose();
  }
}
