import * as THREE from "three";
import type { ShowcaseView } from "@/platform/games/game-api";
import type { MatchView } from "../engine";

/** A frozen moment of the showcase match, and the camera it is seen from (null for the broadcast camera). */
export interface Still {
  seek: number;
  camera: ((view: MatchView) => { pos: THREE.Vector3; look: THREE.Vector3; fov: number }) | null;
}

/**
 * The home screen's stills, from the showcase's seeded game (seed 11).
 * The poster is the first pass of the game at the top of its arc, seen
 * from the broadcast camera behind the play. The icon is the QB a beat
 * before he lets that same pass go, from low and to the side where he
 * faces as he winds up, a heroic close up for the square tile.
 */
export const STILLS: Partial<Record<ShowcaseView, Still>> = {
  poster: { seek: 5.5, camera: null },
  icon: {
    seek: 4.99,
    camera: (view) => {
      const qb = view.athletes.find((a) => a.role === "qb" && a.team === view.drive.offense)!;
      // Cocked to throw, the QB has turned side on, so the camera behind the line sees his face and the ball.
      return { pos: new THREE.Vector3(qb.x - 3.4, 1.05, qb.z + 2.6), look: new THREE.Vector3(qb.x - 0.2, 1.45, qb.z), fov: 44 };
    },
  },
};
