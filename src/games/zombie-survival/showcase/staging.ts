import type { Zone } from "../engine/route";
import { HALF_WIDTH } from "../engine/stages";
import { alive, type Zombie } from "../engine/zombie";

/** Escorts keep this far in from the walls, in metres. It leaves the boss the middle of the street, so none shoves it off its mark. */
const WALL = 0.3;

/**
 * Walks every new escort to one side of the street, clear of the boss
 * in the middle, so the dead spread across the screen and each player
 * has one on its side to shoot. Nearer ones stand further out on screen.
 * Each takes the side with fewer standing there, the left on a tie, so
 * it replays exactly.
 */
export class EscortSpread {
  private readonly spots: number[];
  private readonly placed = new Map<number, number>();

  constructor(zone: Zone) {
    const edge = HALF_WIDTH[zone] - WALL;
    this.spots = [-edge, edge];
  }

  update(zombies: readonly Zombie[]): void {
    const standing = zombies.filter((z) => alive(z) && !z.weak.length);
    for (const id of this.placed.keys()) if (!standing.some((z) => z.id === id)) this.placed.delete(id);
    for (const z of standing) {
      if (this.placed.has(z.id)) continue;
      const crowd = this.spots.map((_, i) => [...this.placed.values()].filter((spot) => spot === i).length);
      const spot = crowd.indexOf(Math.min(...crowd));
      this.placed.set(z.id, spot);
      // It appears on its spot already, since the drift to the side is a slow walk.
      z.side = z.targetSide = this.spots[spot]!;
    }
  }
}
