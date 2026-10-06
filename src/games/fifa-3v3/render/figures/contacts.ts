import type { MatchEvent } from "../../engine/events";
import type { MatchView } from "../../engine/view";
import type { AthleteFigure } from "./athlete-figure";

/** Two players closer than this, centre to centre, are touching shoulders. */
const TOUCH = 0.72;
/** The closing speed below which bodies only brush, metres a second. */
const BRUSH = 1.1;
/** A pair rocks at most this often, so a long shoulder to shoulder tussle is a series of shoves, not a shudder. */
const COOLDOWN = 0.35;

/**
 * Who hit whom, for the bodies to react. Players running into each
 * other are found here by their closing speed, the heavier one rocking
 * the lighter one more; tackles, fouls, steals and the ball smacking
 * into someone arrive as match events.
 */
export class Contacts {
  private readonly last = new Map<number, { x: number; z: number }>();
  private readonly cool = new Map<string, number>();

  update(view: MatchView, figures: readonly AthleteFigure[], dt: number): void {
    const athletes = view.athletes;
    for (const [key, t] of this.cool) {
      if (t - dt <= 0) this.cool.delete(key);
      else this.cool.set(key, t - dt);
    }
    for (let i = 0; i < athletes.length; i++) {
      for (let j = i + 1; j < athletes.length; j++) {
        const a = athletes[i]!;
        const b = athletes[j]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const key = `${i}:${j}`;
        if (d > TOUCH || d < 1e-3 || this.cool.has(key) || dt <= 0) continue;
        const la = this.last.get(i);
        const lb = this.last.get(j);
        if (!la || !lb) continue;
        // How fast the gap was shrinking along the line between them.
        const closing = -(((b.x - lb.x) - (a.x - la.x)) * dx + ((b.z - lb.z) - (a.z - la.z)) * dz) / d / dt;
        if (closing < BRUSH || closing > 15) continue;
        const ma = mass(figures[i]);
        const mb = mass(figures[j]);
        const k = Math.min(1.4, closing / 5);
        figures[i]?.knock(-dx, -dz, (k * 2 * mb) / (ma + mb));
        figures[j]?.knock(dx, dz, (k * 2 * ma) / (ma + mb));
        this.cool.set(key, COOLDOWN);
      }
    }
    athletes.forEach((a, i) => this.last.set(i, { x: a.x, z: a.z }));
  }

  onEvent(event: MatchEvent, view: MatchView, figures: readonly AthleteFigure[]): void {
    const at = (id: number | null | undefined) => (id === null || id === undefined ? undefined : view.athletes[id]);
    const push = (from: { x: number; z: number } | undefined, id: number | null | undefined, strength: number) => {
      const to = at(id);
      if (!from || !to || id === null || id === undefined) return;
      figures[id]?.knock(to.x - from.x, to.z - from.z, strength);
    };
    switch (event.type) {
      case "tackle":
        push(at(event.athlete), event.victim, event.won ? 1.1 : 0.5);
        break;
      case "foul":
        push(at(event.by), event.victim, 1.3);
        break;
      case "steal":
        push(at(event.athlete), event.victim, event.won ? 0.6 : 0.3);
        break;
      case "block":
        // The ball drives the body back along its own path.
        push({ x: event.at.x, z: event.at.z }, event.athlete, Math.min(1.5, event.speed / 18));
        break;
    }
  }
}

/** A player's weight for shoves, from height and build. */
function mass(f: AthleteFigure | undefined): number {
  if (!f) return 75;
  const { height, build } = f.spec.look;
  return 60 + 45 * (height - 1.7) + 25 * build;
}
