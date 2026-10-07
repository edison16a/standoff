import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { BuildId } from "../../builds";
import { buildOf } from "../athlete";
import { Match } from "../match";
import { basketDir } from "../move-pick";
import { between, seeded } from "../rng";
import { GREEN_MS, greenHalfMs } from "../shot-model";
import { STEP } from "../tuning";
import { dist2 } from "../vec";
import { ShotLog, type ShotRecord } from "./shot-log";

/** Who guards the shooter: a computer, or a person holding Guard with the stick let go. */
export type DrillDefender = "bot" | "guard";
/** How the shooter makes room: a stepback move into the jumper, or Shoot straight into the hop off a man in his chest. */
export type DrillPlay = "move" | "hop";

export interface DrillOptions {
  defender: DrillDefender;
  play: DrillPlay;
  /** The defender reaches for the ball just before the stepback, so he has bitten. */
  bite?: boolean;
  reps: number;
  level?: BotLevel;
  shooter?: BuildId;
  guard?: BuildId;
  firstSeed?: number;
}

export interface DrillResult {
  shots: ShotRecord[];
  /** Stepbacks that shook the defender. */
  shakes: number;
  /** Turnovers on the move: a fumble or a steal before the shot. */
  lost: number;
}

/**
 * One on one at the top of the key, the way a person plays it: a hard
 * dribble at the defender, then a stepback and the jumper, let go
 * around the green. It measures what the stepback really buys against
 * the computer and against a person on Guard.
 */
export function runStepbackDrill(o: DrillOptions): DrillResult {
  const out: DrillResult = { shots: [], shakes: 0, lost: 0 };
  for (let rep = 0; rep < o.reps; rep++) playRep(o, (o.firstSeed ?? 1) + rep, out);
  return out;
}

function playRep(o: DrillOptions, seed: number, out: DrillResult): void {
  const human = o.defender === "guard";
  const m = new Match({
    seed, firstOffence: 0, botLevel: o.level ?? "hard",
    entries: [{ team: 0, build: o.shooter ?? "shooter", seat: 0 }, { team: 1, build: o.guard ?? "allround", seat: human ? 1 : null }],
  });
  const rng = seeded(seed * 7919);
  const [s, d] = [m.athletes[0]!, m.athletes[1]!];
  m.checkBeat = false;
  m.phase = "live";
  m.ball.holder = 0;
  Object.assign(s, { x: between(rng, -1.5, 1.5), z: 9.6, yaw: Math.PI });
  Object.assign(d, { x: s.x * 0.85, z: 8.2, yaw: 0 });
  m.brains.reset();
  if (human) m.setGuard(1, true);
  const log = new ShotLog();
  // How close the jab gets before the move, and how far off the green the thumb lets go.
  const jab = between(rng, 0.95, 1.5);
  const holdMs = GREEN_MS + between(rng, -1.6, 1.6) * greenHalfMs(buildOf(s).stats.shooting);
  let stage: "jab" | "move" | "shot" = "jab";
  let pressedAt = -1;
  for (let t = 0; t < 4; t += STEP) {
    if (stage === "jab") {
      const f = basketDir(s);
      m.setMove(0, t > 0.25 ? { x: f.x * 0.7, z: f.z * 0.7 } : { x: 0, z: 0 });
      if ((t > 0.6 && dist2(s, d) < jab) || t > 2.2) {
        m.setMove(0, { x: 0, z: 0 });
        if (o.bite) m.press(1, "defend");
        if (o.play === "move") m.press(0, "defend", { x: -f.x, z: -f.z });
        else m.press(0, "shoot");
        pressedAt = t;
        stage = o.play === "move" ? "move" : "shot";
      }
    } else if (stage === "move" && t - pressedAt > 0.1) {
      m.press(0, "shoot");
      pressedAt = t;
      stage = "shot";
    } else if (stage === "shot" && s.action.kind === "shoot" && !s.action.released && s.action.t * 1000 >= holdMs) {
      m.release(0, holdMs);
    }
    m.step(STEP);
    const events = m.drainEvents();
    log.observe(m, events);
    for (const e of events) {
      if (e.type === "shake" && e.id === 0) out.shakes++;
      if (e.type === "fumble" || e.type === "steal") out.lost++;
    }
    if (events.some((e) => e.type === "score" || e.type === "rebound" || e.type === "fumble" || e.type === "steal")) break;
  }
  out.shots.push(...log.shots);
}
