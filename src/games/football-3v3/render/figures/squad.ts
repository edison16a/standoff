import * as THREE from "three";
import type { AthleteView, MatchView } from "../../engine/view";
import { LINEMAN_NUMBERS } from "../../roster";
import { TEAMS } from "../../teams";
import { SPIKE_RELEASE } from "../anim/celebrations";
import type { PoseScene } from "../anim/choose";
import { characterKit, linemanKit, type KitSpec } from "../models/kit";
import { BallModel } from "./ball-view";
import { Figure } from "./figure";
import { Ring } from "./rings";

/** The offensive lineman over the ball snaps it. */
export function centerOf(view: MatchView): number | null {
  let best: AthleteView | null = null;
  for (const a of view.athletes) {
    if (a.role !== "lineman" || a.team !== view.drive.offense) continue;
    if (!best || Math.abs(a.z - view.drive.ballZ) < Math.abs(best.z - view.drive.ballZ)) best = a;
  }
  return best?.id ?? null;
}

function kitOf(a: AthleteView): KitSpec {
  if (a.character) return characterKit(a.team, a.character);
  const slot = Math.max(0, LINEMAN_NUMBERS[a.team].indexOf(a.number));
  return linemanKit(a.team, a.number, slot);
}

/**
 * Every player and the ball. Figures are built the first time a player
 * shows up in a view and rebuilt only if their character changes, so a
 * lineup set in the lobby costs nothing per frame.
 */
export class Squad {
  readonly group = new THREE.Group();
  readonly ball = new BallModel();
  private readonly figures = new Map<number, { figure: Figure; key: string; seat: Ring }>();
  private readonly target = new Ring("#fff27a", 0.55, 0.85);
  private readonly material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 });

  constructor() {
    this.group.add(this.ball.group, this.target.mesh);
  }

  figure(id: number): Figure | null {
    return this.figures.get(id)?.figure ?? null;
  }

  update(view: MatchView, dt: number, time: number): void {
    const center = centerOf(view);
    const kicker = view.kick?.kicker ?? null;
    const scene: PoseScene = {
      phase: view.phase, phaseT: view.phaseT, offense: view.drive.offense, ball: view.ball,
      winner: view.winner, center: false, kicker,
    };
    let targeted: AthleteView | null = null;
    for (const a of view.athletes) {
      const entry = this.ensure(a);
      entry.figure.update(a, { ...scene, center: a.id === center }, dt, time);
      entry.seat.update(a.seat !== null && view.phase !== "over", a.x, a.z, time, dt, 0.55);
      if (a.targeted) targeted = a;
    }
    const aiming = targeted !== null && (view.ball.state === "held" || view.ball.state === "pass");
    this.target.update(aiming, targeted?.x ?? 0, targeted?.z ?? 0, time, dt, 1, view.ball.state === "held");
    const holderId = view.ball.holder;
    const holder = holderId !== null ? this.figure(holderId) : null;
    const h = view.athletes.find((a) => a.id === holderId);
    const spiking = !!h && h.action === "celebrate" && h.spike && h.actionT >= SPIKE_RELEASE;
    this.ball.update(view.ball, holder, spiking, dt);
  }

  private ensure(a: AthleteView) {
    const key = `${a.team}:${a.character ?? "line"}:${a.number}`;
    const have = this.figures.get(a.id);
    if (have && have.key === key) return have;
    if (have) {
      have.figure.dispose();
      have.seat.mesh.removeFromParent();
      have.seat.dispose();
    }
    const figure = new Figure(kitOf(a), this.material, a.id);
    const seat = new Ring(TEAMS[a.team].color, 0.62, 0.74);
    this.group.add(figure.root, seat.mesh);
    const entry = { figure, key, seat };
    this.figures.set(a.id, entry);
    return entry;
  }

  dispose(): void {
    for (const { figure, seat } of this.figures.values()) {
      figure.dispose();
      seat.dispose();
    }
    this.figures.clear();
    this.target.dispose();
    this.ball.dispose();
    this.material.dispose();
  }
}
