import { createMatch } from "../engine/match";
import type { Command, MatchState } from "../engine/types";
import type { Lab } from "./lab";
import type { LabStill } from "./lab-director";

/*
 * The icon's staged moment, played through the real engine like the move
 * lab: the karate charges a Dragon Uppercut into the bear standing close
 * and launches it high over the rooftop. Staged rather than cut from the
 * filmed fight, so the hero can face the camera with the bear flying up
 * behind, which a side on brawl never lines up by itself.
 */

/** Frames the button is held, long enough to become the charged move. */
const HOLD = 40;
/** Where the two stand, metres: in reach of the uppercut, out past the high platforms so nothing hides the bear in flight. */
const KARATE_X = 6.6;
const BEAR_X = 7.3;

const none = (): Command => ({ x: 0, y: 0 });

/**
 * The icon: the fist at the top of the uppercut with the bear launched
 * above it, from low in front so the karate faces the viewer. Seconds
 * count from the match's start, countdown included.
 */
export const COVER_STILL: LabStill = { at: 3.8, cam: { x: 6.95, y: 2.3, distance: 4.6, yaw: 0.6, lift: -0.6, fov: 46 } };

/** The karate against a still bear on the Dojo Rooftop, the uppercut pressed as the fight starts. */
export function makeCover(): Lab {
  const match = createMatch(
    [
      { character: "karate", seat: 0 },
      { character: "bear", seat: 1 },
    ],
    { seed: 1, stage: "dojo-rooftop", stocks: 9 },
  );
  let placed = false;
  return {
    match,
    marks: [{ name: "uppercut", at: 0 }],
    command(state: MatchState) {
      if (state.phase !== "fight") return none();
      if (!placed) {
        place(state);
        placed = true;
      }
      const frame = state.phaseFrame;
      if (frame >= HOLD) return none();
      // Pressed up with the button held, then let go: a charged up light, the uppercut.
      return { x: 0, y: frame === 0 ? 1 : 0, lightHeld: true, light: frame === 0 };
    },
  };
}

/** Stands the two face to face in the middle of the main floor. */
function place(state: MatchState): void {
  const main = state.stage.surfaces[0]!;
  for (const [id, x, facing] of [[0, KARATE_X, 1], [1, BEAR_X, -1]] as const) {
    const who = state.fighters[id];
    if (!who) continue;
    Object.assign(who, { action: "idle", frame: 0, move: null, facing, percent: 60, platform: null });
    who.pos = { x, y: main.top };
    who.vel = { x: 0, y: 0 };
  }
}
