import * as THREE from "three";
import { RUNNER_COLOURS } from "../../engine/playbook/colours";
import type { PlayRunnerView } from "../../engine/playbook/view";
import type { MatchView } from "../../engine/view";
import { PlayBadge } from "./play-badge";
import { Ring } from "./rings";
import { arrowGeometry } from "./route-arrow";
import type { Squad } from "./squad";

/** One runner's marks: a ring in his colour, his number over his helmet, and his route's first steps on the turf. */
interface Mark {
  ring: Ring;
  badge: PlayBadge;
  arrow: THREE.Mesh | null;
  arrowKey: string;
  arrowMaterial: THREE.MeshBasicMaterial;
  glow: number;
}

const top = new THREE.Vector3();

/**
 * The play's four runners on the big screen, in the colours and numbers
 * of the QB's card (engine/playbook/view.ts): while he picks, each wears
 * his ring and number; lined up, an arrow shows where his route goes
 * first; into the play the rings stay while the ball is still to be
 * thrown, and everything fades once it is gone. Rings and arrows lie on
 * the turf; the numbers float over the picture like the name tags.
 */
export class PlayMarks {
  readonly group = new THREE.Group();
  readonly overlay = new THREE.Group();
  private readonly marks = new Map<string, Mark>();

  /** `shown` is false through a replay; `tagged` says who has a name tag, so the number sits above it. */
  update(view: MatchView, squad: Squad, fov: number, shown: boolean, tagged: (id: number) => boolean, dt: number, time: number): void {
    const want = new Map<string, PlayRunnerView>();
    if (shown && view.playbook) for (const r of view.playbook.runners) want.set(`${r.id}:${r.n}`, r);
    for (const [key, r] of want) if (!this.marks.has(key)) this.marks.set(key, this.make(r.n));
    const ease = 1 - Math.exp(-dt * 8);
    for (const [key, mark] of this.marks) {
      const r = want.get(key);
      const a = r ? view.athletes.find((x) => x.id === r.id) : null;
      mark.glow += ((a ? 1 : 0) - mark.glow) * ease;
      if (!a && mark.glow < 0.02) {
        this.drop(key);
        continue;
      }
      const at = a ?? null;
      // Into the play the ring is all that is left, quieter, so the target ring still stands out.
      const live = view.playbook?.stage === "live";
      if (at) mark.ring.update(true, at.x, at.z, time, dt, live ? 0.55 : 0.95, view.playbook?.stage === "picking");
      else mark.ring.update(false, 0, 0, time, dt);
      this.arrow(mark, r?.arrow ?? null, view.playbook?.stage === "set" ? mark.glow : 0);
      const figure = at ? squad.figure(at.id) : null;
      if (figure && at) {
        figure.top(top);
        mark.badge.place(top, fov, tagged(at.id) ? 1 : 0, live ? 0 : mark.glow);
      } else mark.badge.place(top, fov, 0, 0);
    }
  }

  private make(n: number): Mark {
    const colour = RUNNER_COLOURS[n - 1] ?? "#ffffff";
    const ring = new Ring(colour, 0.78, 0.94, true);
    const badge = new PlayBadge(n, colour);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    this.group.add(ring.mesh);
    this.overlay.add(badge.sprite);
    return { ring, badge, arrow: null, arrowKey: "", arrowMaterial, glow: 0 };
  }

  /** Builds the arrow when its route changes, and fades it with the line up. */
  private arrow(mark: Mark, points: PlayRunnerView["arrow"], opacity: number): void {
    const key = points ? points.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(";") : mark.arrowKey;
    if (points && key !== mark.arrowKey) {
      mark.arrow?.geometry.dispose();
      mark.arrow?.removeFromParent();
      const g = arrowGeometry(points);
      mark.arrow = g ? new THREE.Mesh(g, mark.arrowMaterial) : null;
      if (mark.arrow) {
        mark.arrow.renderOrder = 2;
        this.group.add(mark.arrow);
      }
      mark.arrowKey = key;
    }
    mark.arrowMaterial.opacity = 0.9 * opacity;
    if (mark.arrow) mark.arrow.visible = opacity > 0.02;
  }

  private drop(key: string): void {
    const mark = this.marks.get(key);
    if (!mark) return;
    mark.ring.mesh.removeFromParent();
    mark.ring.dispose();
    mark.badge.sprite.removeFromParent();
    mark.badge.dispose();
    mark.arrow?.geometry.dispose();
    mark.arrow?.removeFromParent();
    mark.arrowMaterial.dispose();
    this.marks.delete(key);
  }

  dispose(): void {
    for (const key of [...this.marks.keys()]) this.drop(key);
  }
}
