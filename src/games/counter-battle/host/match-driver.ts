import { Battle } from "../engine/battle";
import type { BattleEvent } from "../engine/events";
import type { Fighter } from "../engine/fighter";
import { STEP } from "../engine/tuning";
import { aimTarget, type CameraPose, type PanePoint } from "../render/camera/aim-ray";
import type { Label } from "../render/fighter-view";
import { splitPanes, type Pane, type ViewRect } from "../render/layout";
import type { Lineup } from "./lineup";

/** A frame longer than this is a stall; the match does not try to catch up past it. */
const MAX_FRAME = 0.1;

/**
 * Runs one match on the host. It steps the battle at the engine's fixed
 * rate from however fast the screen draws, turns each player's point in
 * their own view into a point in the world for their gun, and passes on
 * the trigger and reload. A phone that drops has the computer shoot for
 * it until it is back.
 */
export class MatchDriver {
  readonly battle: Battle;
  readonly labels: Label[];
  /** The split screen for this match: one view per player, in fighter order. */
  readonly panes: Pane[];
  readonly bySeat = new Map<number, number>();
  /** Which players hold the shoot button, whatever the match is doing. */
  private readonly held = new Set<number>();
  private carry = 0;

  constructor(lineup: Lineup, seed: number, roundsToWin?: number) {
    this.battle = new Battle(lineup.setups, seed, { roundsToWin });
    this.labels = lineup.setups.map((s, i) => ({ name: s.name, color: lineup.colours[i]! }));
    for (const f of this.battle.fighters) if (f.seat !== null) this.bySeat.set(f.seat, f.id);
    this.panes = splitPanes(this.humans.map((f) => ({ id: f.id, team: f.team })));
  }

  get humans(): Fighter[] {
    return this.battle.fighters.filter((f) => f.seat !== null);
  }

  fighterOf(seat: number): Fighter | undefined {
    const id = this.bySeat.get(seat);
    return id === undefined ? undefined : this.battle.fighters[id];
  }

  /** A player's view as fractions of the screen, which is also where they aim. */
  viewOf(seat: number): ViewRect | null {
    const id = this.bySeat.get(seat);
    return this.panes.find((p) => p.fighter === id)?.rect ?? null;
  }

  /** Points a player's gun at what is under their aim in their view. */
  aim(seat: number, point: PanePoint, pose: CameraPose | null): void {
    const f = this.fighterOf(seat);
    if (!f || !pose || !f.alive) return;
    const b = this.battle;
    b.aimAt(f.id, aimTarget(pose, clampPoint(point), b.pieces, b.fighters, f.id));
  }

  /**
   * The shoot button. It fires only while the fight is on; a button held
   * from before the fight, or through a new round, is pulled as the fight
   * starts, like a real trigger held down.
   */
  trigger(seat: number, down: boolean): void {
    const f = this.fighterOf(seat);
    if (!f) return;
    if (down) this.held.add(seat);
    else this.held.delete(seat);
    if (!down || this.battle.match.phase === "fight") this.battle.setTrigger(f.id, down);
  }

  reload(seat: number): void {
    const f = this.fighterOf(seat);
    if (f) this.battle.reload(f.id);
  }

  /** A phone dropped or came back: the computer shoots for it meanwhile. */
  setOnline(seat: number, online: boolean): void {
    const f = this.fighterOf(seat);
    if (!f) return;
    this.held.delete(seat);
    this.battle.setAutopilot(f.id, !online);
  }

  /** Steps the battle through a real frame, `turbo` times over for tests, and returns what happened. */
  advance(realDt: number, turbo = 1): BattleEvent[] {
    this.carry += Math.min(MAX_FRAME, Math.max(0, realDt)) * turbo;
    const events: BattleEvent[] = [];
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.pullHeld();
      events.push(...this.battle.step());
    }
    return events;
  }

  /** Pulls every trigger held down while the fight is on, as the fight starts or a player comes back. */
  private pullHeld(): void {
    if (this.battle.match.phase !== "fight") return;
    for (const seat of this.held) {
      const f = this.fighterOf(seat);
      if (f?.alive && !f.trigger.held) this.battle.setTrigger(f.id, true);
    }
  }
}

/** Aim a little past the view's edge still counts, as the kit allows; further is held there. */
function clampPoint(p: PanePoint): PanePoint {
  return { x: Math.max(-1.1, Math.min(1.1, p.x)), y: Math.max(-1.1, Math.min(1.1, p.y)) };
}
