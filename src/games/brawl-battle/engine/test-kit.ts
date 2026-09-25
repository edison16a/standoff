import type { CharacterId } from "../roster";
import { createMatch, stepMatch } from "./match";
import type { StageId } from "./stages";
import type { Command, Fighter, MatchState } from "./types";

/**
 * Helpers for the engine's tests: a match already past its countdown,
 * with fighters placed by hand, played with scripted commands.
 */

export function fightNow(characters: CharacterId[], opts: { stage?: StageId; bots?: boolean; seed?: number } = {}): MatchState {
  const state = createMatch(
    characters.map((character, i) => ({ character, seat: opts.bots ? null : i + 1 })),
    { stage: opts.stage ?? "dojo-rooftop", seed: opts.seed ?? 7 },
  );
  state.phase = "fight";
  state.phaseFrame = 0;
  return state;
}

/** Stands a fighter on the main platform at x, facing `facing`. */
export function place(f: Fighter, x: number, facing: 1 | -1 = 1): void {
  f.pos = { x, y: 0 };
  f.vel = { x: 0, y: 0 };
  f.launch = { x: 0, y: 0 };
  f.ground = 0;
  f.facing = facing;
  f.action = "idle";
  f.frame = 0;
}

/** Puts a fighter in the air at a point, falling freely. */
export function hang(f: Fighter, x: number, y: number): void {
  place(f, x);
  f.pos.y = y;
  f.ground = null;
  f.action = "air";
}

/** Steps the match `frames` times, with each fighter's command from `script` (by id, then frame). */
export function run(state: MatchState, frames: number, script: (id: number, frame: number) => Command | undefined = () => undefined): MatchState["events"] {
  const events: MatchState["events"] = [];
  for (let i = 0; i < frames; i++) {
    const commands = new Map<number, Command>();
    for (const f of state.fighters) {
      const cmd = script(f.id, i);
      if (cmd) commands.set(f.id, cmd);
    }
    stepMatch(state, commands);
    events.push(...state.events);
  }
  return events;
}

/** Only fighter `id` gets `cmd` on frame `at`; everyone else stands still. */
export function once(id: number, at: number, cmd: Command): (who: number, frame: number) => Command | undefined {
  return (who, frame) => (who === id && frame === at ? cmd : undefined);
}
