import * as THREE from "three";
import type { AthleteView, MatchView } from "../../engine/view";
import { TEAMS } from "../../teams";
import { Ring } from "./rings";

/** One marker on its way from the passer to the teammate the phone took over. */
interface Flight {
  seat: number;
  from: number;
  to: number;
  t: number;
  dur: number;
  ring: Ring;
}

/** How long the marker takes to cross: quick, longer for a long throw. */
const flightTime = (d: number) => 0.32 + Math.min(0.35, d / 90);

/** After it lands the new ring pulses this long, so the eye follows it. */
export const ARRIVE_PULSE = 1.1;

const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));

/**
 * The control marker moving. When a phone passes to a computer teammate
 * and takes him over, the views move its seat from one player to the
 * other; this sends a bright ring skimming along the turf from the
 * passer to the new player, swelling in the middle of its run, and then
 * lets the new player's ring pulse for a moment. It reads the views
 * only, so replays show the same move.
 */
export class ControlSwitch {
  readonly group = new THREE.Group();
  private readonly last = new Map<number, number>();
  private readonly flights: Flight[] = [];
  /** Players whose ring has just been reached, and seconds left of their pulse. */
  private readonly arrived = new Map<number, number>();
  /** The last view's match time, to tell a cut (into or out of a replay) from play going on. */
  private lastTime: number | null = null;

  update(view: MatchView, dt: number, time: number): void {
    const seen = new Map<number, AthleteView>();
    for (const a of view.athletes) if (a.seat !== null) seen.set(a.seat, a);
    // A new play, the final whistle or a cut puts everyone back without a flight: only a switch in play flies.
    const cut = this.lastTime === null || Math.abs(view.time - this.lastTime) > 0.5;
    const flies = !cut && view.phase !== "choose" && view.phase !== "convert" && view.phase !== "over";
    this.lastTime = view.time;
    for (const [seat, a] of seen) {
      const before = this.last.get(seat);
      if (flies && before !== undefined && before !== a.id) this.launch(view, seat, before, a);
      this.last.set(seat, a.id);
    }
    for (const seat of [...this.last.keys()]) if (!seen.has(seat)) this.last.delete(seat);
    for (const [id, left] of this.arrived) {
      if (left - dt <= 0) this.arrived.delete(id);
      else this.arrived.set(id, left - dt);
    }
    for (const f of [...this.flights]) this.fly(f, view, dt, time);
  }

  /** Seconds of pulse left on a player's ring after the marker reached him, or 0. */
  pulse(id: number): number {
    return this.arrived.get(id) ?? 0;
  }

  /** Whether a marker is still on its way to this player, so his own ring waits for it. */
  incoming(id: number): boolean {
    return this.flights.some((f) => f.to === id);
  }

  private launch(view: MatchView, seat: number, from: number, to: AthleteView): void {
    const a = view.athletes.find((o) => o.id === from);
    if (!a) return;
    const ring = new Ring("#ffffff", 0.55, 0.8);
    ring.setColor(TEAMS[to.team].color);
    this.group.add(ring.mesh);
    this.flights.push({ seat, from, to: to.id, t: 0, dur: flightTime(Math.hypot(to.x - a.x, to.z - a.z)), ring });
  }

  private fly(f: Flight, view: MatchView, dt: number, time: number): void {
    f.t += dt;
    const a = view.athletes.find((o) => o.id === f.from);
    const b = view.athletes.find((o) => o.id === f.to);
    const u = Math.min(1, f.t / f.dur);
    if (!a || !b || u >= 1) {
      this.flights.splice(this.flights.indexOf(f), 1);
      f.ring.mesh.removeFromParent();
      f.ring.dispose();
      if (b) this.arrived.set(b.id, ARRIVE_PULSE);
      return;
    }
    const k = ease(u);
    f.ring.update(true, a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, time, dt * 4, 1, false);
    f.ring.mesh.scale.setScalar(1 + Math.sin(u * Math.PI) * 0.9);
  }

  dispose(): void {
    for (const f of this.flights) f.ring.dispose();
    this.flights.length = 0;
  }
}
