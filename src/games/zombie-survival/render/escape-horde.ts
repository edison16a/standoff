import type { SurvivalGame } from "../engine/game";
import { fightFrame, segment, type FightFrame } from "../engine/route";
import { STAGE_COUNT } from "../engine/stages";
import { makeZombie, type Zombie } from "../engine/zombie";
import type { ZombieKind } from "../engine/zombie-kinds";

/** Seconds into the escape when the dead come pouring down the pier after the team. */
const ARRIVE = 6.5;
/** How close to the pier's end they get, in metres. The ship is already out of reach. */
const EDGE = 1.6;

/**
 * The last sight of the city: a crowd of the dead running down the pier
 * after the ship, piling up at the edge and reaching for it as it pulls
 * away. They are scenery, not a fight. Positions are measured back from
 * the pier's end, so each one faces the ship.
 */
export class EscapeHorde {
  readonly frame: FightFrame = pierEnd();
  private zombies: Zombie[] = [];

  /** The horde for this frame, or an empty list when the escape is not playing. */
  update(game: SurvivalGame, dt: number): readonly Zombie[] {
    const t = game.phase === "cutscene" && game.cutscene === "escape" ? game.phaseTime : game.phase === "escaped" ? 16 + game.phaseTime : -1;
    if (t < ARRIVE) {
      this.zombies = [];
      return this.zombies;
    }
    if (this.zombies.length === 0) this.zombies = crowd();
    for (const z of this.zombies) {
      z.age += dt;
      z.stateTime += dt;
      if (z.state === "walk") {
        z.ahead = Math.max(EDGE, z.ahead - z.speed * dt);
        if (z.ahead <= EDGE) {
          z.state = "attack";
          z.stateTime = 0;
        }
      } else {
        // Swinging at the air where the gangway was.
        z.swingIn = z.swingIn - dt <= 0 ? 1.4 + z.seed : z.swingIn - dt;
      }
    }
    return this.zombies;
  }
}

function crowd(): Zombie[] {
  const kinds: ZombieKind[] = ["runner", "walker", "runner", "walker", "brute", "walker", "runner", "walker"];
  return kinds.map((kind, i) => {
    const seed = ((i * 0.618) % 1) * 0.9 + 0.05;
    const side = ((i % 4) - 1.5) * 1.3 + (seed - 0.5);
    const ahead = 9 + i * 2.6 + seed * 3;
    const speedScale = kind === "runner" ? 1.2 : 1.6;
    return makeZombie(-100 - i, kind, ahead, side, side, { hpScale: 1, speedScale, harm: 1, weakHp: 1, seed });
  });
}

/** A frame at the far end of the pier looking back toward the city, so "ahead" runs up the pier. */
function pierEnd(): FightFrame {
  const pier = fightFrame(STAGE_COUNT);
  const length = segment(STAGE_COUNT + 1).length;
  const origin = pier.place(length - 2, 0);
  const forward = { x: -pier.forward.x, z: -pier.forward.z };
  const right = { x: -pier.right.x, z: -pier.right.z };
  return {
    origin,
    forward,
    right,
    heading: pier.heading + Math.PI,
    place: (ahead, side) => ({ x: origin.x + forward.x * ahead + right.x * side, y: origin.y, z: origin.z + forward.z * ahead + right.z * side }),
  };
}
