import { attackSign } from "../teams";
import { brake, moveAthlete } from "./athlete";
import { goalX } from "./goal";
import { PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist, norm, sub, type Vec2 } from "./vec";

/** How long the scorer runs toward the cameras before breaking into the celebration. */
const RUN_OFF = 1.3;

/**
 * After a goal: the scorer peels away toward the corner by the cameras
 * and does their signature celebration, team mates chase after them, and
 * the other side trudges back.
 */
export function celebrateGoal(state: MatchState, dt: number): void {
  const goal = state.lastGoal;
  if (!goal) return;
  const scorer = goal.scorer !== null ? state.athletes[goal.scorer] : undefined;
  const s = attackSign(goal.team);
  const corner: Vec2 = { x: s * (PITCH.halfLength - 4), z: PITCH.halfWidth - 2.2 };
  for (const a of state.athletes) {
    a.actionT += dt;
    if (a.team !== goal.team) {
      setAction(a, "dejected");
      const home = { x: goalX(a.team) + attackSign(a.team) * 6, z: a.pos.z * 0.8 };
      moveToward(a, home, 0.3, dt);
      continue;
    }
    if (a === scorer) {
      if (state.phaseT < RUN_OFF) {
        setAction(a, "free");
        moveToward(a, corner, 1, dt);
      } else {
        setAction(a, "celebrate");
        brake(a, dt, 6);
        faceCamera(a, dt);
      }
      continue;
    }
    const target = scorer ? scorer.pos : corner;
    if (dist(a.pos, target) > 1.8) {
      setAction(a, "free");
      moveToward(a, target, 0.9, dt);
    } else {
      setAction(a, "celebrate");
      brake(a, dt, 6);
      faceCamera(a, dt);
    }
  }
}

/**
 * At the final whistle the winners line up side by side to celebrate,
 * so the camera can circle them, and the losers trudge away.
 */
export function celebrateWin(state: MatchState, dt: number): void {
  const winners = state.athletes.filter((a) => a.team === state.winner);
  const middle = { x: 0, z: 0 };
  for (const a of winners) {
    middle.x += a.pos.x / winners.length;
    middle.z += a.pos.z / winners.length;
  }
  // They meet toward the middle of the pitch, clear of the goals, where the camera can circle them.
  middle.x *= 0.4;
  middle.z *= 0.4;
  for (const a of state.athletes) {
    a.actionT += dt;
    if (state.winner !== a.team) {
      setAction(a, "dejected");
      // Losers trudge off out of the winners' huddle, so the camera circling it never finds them in the middle.
      const away = sub(a.pos, middle);
      const gap = Math.hypot(away.x, away.z);
      if (gap < 5) moveToward(a, { x: a.pos.x + (gap > 0.1 ? away.x / gap : 1) * 2, z: a.pos.z + (gap > 0.1 ? away.z / gap : 0) * 2 }, 0.35, dt);
      else brake(a, dt, 5);
    } else {
      // Side by side in a row facing the cameras, like a team photo, rather than piled into one another.
      const spot = { x: middle.x + (a.slot - 1) * 1.5, z: middle.z };
      const settled = a.action === "celebrate" ? 1.2 : 0.35;
      if (dist(a.pos, spot) <= settled) {
        setAction(a, "celebrate");
        brake(a, dt, 5);
        faceCamera(a, dt);
        continue;
      }
      setAction(a, "free");
      moveToward(a, spot, 0.6, dt);
    }
  }
}

function setAction(a: Athlete, action: Athlete["action"]): void {
  if (a.action === action) return;
  a.action = action;
  a.actionT = 0;
  a.charging = false;
}

function moveToward(a: Athlete, target: Vec2, pace: number, dt: number): void {
  const to = sub(target, a.pos);
  const d = Math.hypot(to.x, to.z);
  const dir = norm(to);
  const k = Math.min(1, d / 1.2) * pace;
  moveAthlete(a, { x: dir.x * k, z: dir.z * k }, dt, false);
}

/** The cameras sit on the near side, at positive z. */
function faceCamera(a: Athlete, dt: number): void {
  const d = ((Math.PI / 2 - a.facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  a.facing += Math.max(-4 * dt, Math.min(4 * dt, d));
}
