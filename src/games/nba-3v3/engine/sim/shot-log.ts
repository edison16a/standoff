import { contestFor } from "../contest";
import type { MatchEvent } from "../events";
import type { Match } from "../match";
import type { TeamId } from "../types";
import { dist2 } from "../vec";

/** How a field goal was taken, for the tables. */
export type ShotType = "two" | "three" | "floater" | "layup" | "dunk";

export interface ShotRecord {
  type: ShotType;
  /** The contest the shot model saw, 0 open to 1 a hand in the face. */
  contest: number;
  /** Metres to the nearest defender as it left the hand. */
  space: number;
  /** A jumper off a stepback: the hop on Shoot, or out of a stepback move. */
  stepback: boolean;
  /** The make chance the model gave it. */
  chance: number;
  made: boolean;
}

/** A shot out of a stepback move this soon after it counts as a stepback jumper. */
const MOVE_WINDOW = 1.1;

/**
 * Watches a match step by step and writes down every field goal, how
 * it was taken and whether it fell, plus points and possessions. It only
 * reads the match, so the tests and the tuning script measure the real
 * game, not a model of it.
 */
export class ShotLog {
  readonly shots: ShotRecord[] = [];
  readonly points: [number, number] = [0, 0];
  possessions = 0;
  stepbackMoves = 0;
  stepbackShakes = 0;
  private offence: TeamId | null = null;
  private readonly lastStepback = new Map<number, number>();
  /** The shot still in the air per shooter, settled by a score or the next shot. */
  private readonly open = new Map<number, ShotRecord>();

  /** Reads one step's events. Call after every `step` with what it drained. */
  observe(m: Match, events: readonly MatchEvent[]): void {
    if (m.phase === "live" && m.offence !== this.offence) {
      this.offence = m.offence;
      this.possessions++;
    }
    for (const e of events) this.read(m, e);
  }

  private read(m: Match, e: MatchEvent): void {
    if (e.type === "move" && e.move === "stepback") {
      this.stepbackMoves++;
      this.lastStepback.set(e.id, m.time);
    } else if (e.type === "shake") {
      if ((this.lastStepback.get(e.id) ?? -99) >= m.time - 0.6) this.stepbackShakes++;
    } else if (e.type === "shot" && e.kind !== "free") {
      this.add(m, e.id, typeOf(m, e), e.contest, e.chance, false);
    } else if (e.type === "dunk") {
      // A made dunk has no shot event: size up the defence at the slam, as the game did.
      const a = m.athletes[e.id];
      this.add(m, e.id, "dunk", a ? contestFor(a, m.opponents(a.team), "dunk").contest : 0, 1, true);
    } else if (e.type === "block") {
      const victim = m.athletes[e.victim];
      if (victim?.action.kind === "drive" && victim.action.dunk && !this.open.has(e.victim)) this.add(m, e.victim, "dunk", 1, 0, false);
    } else if (e.type === "score") {
      this.points[e.team] += e.points;
      const rec = this.open.get(e.id);
      if (rec && e.kind !== "free") rec.made = true;
      this.open.delete(e.id);
    }
  }

  private add(m: Match, id: number, type: ShotType, contest: number, chance: number, made: boolean): void {
    const a = m.athletes[id];
    if (!a) return;
    // A new shot settles every one still in the air: a putback means the last one missed.
    this.open.clear();
    const act = a.action;
    const hop = act.kind === "shoot" && !!act.step;
    const fromMove = (this.lastStepback.get(id) ?? -99) >= m.time - MOVE_WINDOW;
    const jumper = type === "two" || type === "three";
    const space = Math.min(...m.opponents(a.team).map((o) => dist2(o, a)));
    const rec: ShotRecord = { type, contest, space, stepback: jumper && (hop || fromMove), chance, made };
    this.shots.push(rec);
    if (!made) this.open.set(id, rec);
  }
}

function typeOf(m: Match, e: Extract<MatchEvent, { type: "shot" }>): ShotType {
  if (e.kind === "layup") return "layup";
  if (e.kind === "dunk") return "dunk";
  const a = m.athletes[e.id];
  if (a?.action.kind === "shoot" && a.action.float) return "floater";
  return e.three ? "three" : "two";
}
