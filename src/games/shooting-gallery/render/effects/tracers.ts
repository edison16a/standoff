import * as THREE from "three";
import { FLIGHT_S } from "../target-views";

/** How long the fading streak lingers after the BB lands. */
const FADE_S = 0.12;
const STREAK = 0.9;

interface Flight {
  ball: THREE.Mesh;
  streak: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
}

/**
 * The BB in flight: a bright copper ball racing from the muzzle to where
 * the shot lands, trailing a short streak in the shooter's colour so every
 * player can see where their shot went.
 */
export class Tracers {
  readonly object = new THREE.Group();
  private readonly flights: Flight[] = [];
  private readonly spare: Flight[] = [];
  private readonly ballGeometry = new THREE.SphereGeometry(0.018, 10, 8);
  private readonly streakGeometry = new THREE.CylinderGeometry(0.2, 1, 1, 8, 1, true).translate(0, -0.5, 0);
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly at = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  fire(from: THREE.Vector3, to: THREE.Vector3, colour: string, now: number): void {
    const flight = this.spare.pop() ?? this.make();
    (flight.streak.material as THREE.MeshBasicMaterial).color.set(colour);
    flight.from.copy(from);
    flight.to.copy(to);
    flight.start = now;
    flight.ball.visible = flight.streak.visible = true;
    this.flights.push(flight);
  }

  update(now: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]!;
      const t = (now - flight.start) / FLIGHT_S;
      if (t > 1 + FADE_S / FLIGHT_S) {
        flight.ball.visible = flight.streak.visible = false;
        this.flights.splice(i, 1);
        this.spare.push(flight);
        continue;
      }
      const along = Math.min(1, t);
      this.at.lerpVectors(flight.from, flight.to, along);
      flight.ball.position.copy(this.at);
      flight.ball.visible = t <= 1;
      this.dir.subVectors(flight.to, flight.from);
      const total = this.dir.length();
      this.dir.normalize();
      // The streak points back along the path from the ball, never past the muzzle.
      const length = Math.min(STREAK, total * along) * (t > 1 ? 1 - (t - 1) / (FADE_S / FLIGHT_S) : 1);
      flight.streak.position.copy(this.at);
      flight.streak.quaternion.setFromUnitVectors(this.up, this.dir);
      flight.streak.scale.set(0.012, Math.max(0.001, length), 0.012);
      (flight.streak.material as THREE.MeshBasicMaterial).opacity = t > 1 ? 0.8 * (1 - (t - 1) / (FADE_S / FLIGHT_S)) : 0.8;
    }
  }

  private make(): Flight {
    const ball = new THREE.Mesh(this.ballGeometry, new THREE.MeshStandardMaterial({ color: "#d99a5b", metalness: 1, roughness: 0.2, emissive: "#ffb070", emissiveIntensity: 0.6 }));
    const streak = new THREE.Mesh(
      this.streakGeometry,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    streak.frustumCulled = false;
    this.object.add(ball, streak);
    return { ball, streak, from: new THREE.Vector3(), to: new THREE.Vector3(), start: 0 };
  }
}
