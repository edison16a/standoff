import { CHARACTERS } from "../roster";
import { LAUNCH, MOVEMENT, RESPAWN } from "./tuning";
import type { Command, Fighter, MatchState } from "./types";

/**
 * Lives. Leaving the blast zone costs one; the fighter comes back on a
 * platform that floats down from above, invincible for a moment. With
 * none left they are out, and the last fighter standing wins.
 */

/** KOs anyone whose middle has left the blast zone. */
export function checkBlastZone(state: MatchState): void {
  const { blast } = state.stage;
  for (const f of state.fighters) {
    if (f.action === "dead" || f.action === "out" || f.action === "respawn") continue;
    const midY = f.pos.y + CHARACTERS[f.character].physique.height / 2;
    if (f.pos.x >= blast.left && f.pos.x <= blast.right && midY >= blast.bottom && midY <= blast.top) continue;
    knockOut(state, f);
  }
}

function knockOut(state: MatchState, f: Fighter): void {
  const recent = f.lastHitBy && state.frame - f.lastHitBy.frame <= LAUNCH.creditFrames ? f.lastHitBy.id : null;
  const by = recent !== null && recent !== f.id ? recent : null;
  if (by !== null) state.fighters[by]!.stats.kos++;
  f.stats.falls++;
  f.stocks = Math.max(0, f.stocks - 1);
  const { blast } = state.stage;
  // The blast is drawn where the fighter crossed the edge.
  const x = Math.max(blast.left, Math.min(blast.right, f.pos.x));
  const y = Math.max(blast.bottom, Math.min(blast.top, f.pos.y));
  state.events.push({ type: "ko", id: f.id, by, x, y, stocksLeft: f.stocks });
  f.action = f.stocks > 0 ? "dead" : "out";
  f.frame = 0;
  f.move = null;
  f.vel = { x: 0, y: 0 };
  f.launch = { x: 0, y: 0 };
  f.ground = null;
  f.freeze = 0;
  f.buffer = null;
  f.lastHitBy = null;
  if (f.stocks === 0) {
    state.eliminated.push({ id: f.id, frame: state.frame });
    state.events.push({ type: "eliminated", id: f.id });
  }
}

/** Waiting to come back, then riding the platform down. Any input steps off it. */
export function stepRespawn(state: MatchState, f: Fighter, cmd: Command): void {
  f.frame++;
  const spot = state.stage.respawns[f.slot % state.stage.respawns.length]!;
  if (f.action === "dead") {
    if (f.frame < RESPAWN.wait) return;
    f.action = "respawn";
    f.frame = 0;
    f.percent = 0;
    f.shield = 1;
    f.airJumps = 1;
    f.recoveryUsed = false;
    f.platform = { x: spot.x, y: spot.y + RESPAWN.drop };
    f.facing = spot.x > 0 ? -1 : 1;
    state.events.push({ type: "respawn", id: f.id });
  }
  const t = Math.min(1, f.frame / RESPAWN.descend);
  const platform = f.platform ?? { x: spot.x, y: spot.y };
  platform.y = spot.y + RESPAWN.drop * (1 - t) * (1 - t);
  f.platform = platform;
  f.pos = { x: platform.x, y: platform.y };
  f.invincible = RESPAWN.invincible;
  const moved = Math.abs(cmd.x) >= MOVEMENT.deadZone || Math.abs(cmd.y) >= MOVEMENT.flick || cmd.jump || cmd.light || cmd.heavy;
  if (t < 1 || (!moved && f.frame < RESPAWN.descend + RESPAWN.hold)) return;
  f.action = "air";
  f.frame = 0;
  f.platform = null;
  f.vel = { x: 0, y: cmd.jump ? CHARACTERS[f.character].physique.jump * 0.6 : 0 };
}

/** Ends the fight once at most one fighter has lives left. Returns true when it did. */
export function checkWinner(state: MatchState): boolean {
  const alive = state.fighters.filter((f) => f.stocks > 0);
  const enough = state.fighters.length > 1 ? alive.length <= 1 : alive.length === 0;
  if (!enough) return false;
  state.winner = alive[0]?.id ?? null;
  assignPlaces(state);
  state.events.push({ type: "game", winner: state.winner });
  return true;
}

/** 1 for the winner, then by who lasted longest. Fighters out on the same step share a place. */
function assignPlaces(state: MatchState): void {
  const survivors = state.fighters.filter((f) => f.stocks > 0);
  for (const f of survivors) f.place = 1;
  let place = survivors.length + 1;
  const outs = [...state.eliminated].reverse();
  for (let i = 0; i < outs.length; ) {
    const frame = outs[i]!.frame;
    const same = outs.slice(i).filter((o) => o.frame === frame);
    for (const o of same) state.fighters[o.id]!.place = place;
    place += same.length;
    i += same.length;
  }
}
