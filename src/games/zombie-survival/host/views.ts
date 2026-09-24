import type { Player } from "@/platform/games/game-api";
import type { Seat } from "@/platform/protocol";
import { MAX_HEALTH, type SurvivalGame } from "../engine/game";
import { objectiveFor } from "../engine/radio";
import { accuracy } from "../engine/stats";
import { stage as stageSpec } from "../engine/stages";
import { alive, weakLeft } from "../engine/zombie";
import { isBoss, KINDS } from "../engine/zombie-kinds";
import type { GunMessage, ScoreMessage, SeatView, StateMessage } from "../protocol/messages";
import type { HudSeat, SurvivalHud } from "./host-store";
import type { Lobby } from "./lobby";

/**
 * Builds what each screen shows from the game, the lobby and the room's
 * players. Pure functions, rebuilt every frame and compared, so the
 * session never has to remember what it last told anyone.
 */

function seatViews(players: readonly Player[], lobby: Lobby, game: SurvivalGame): HudSeat[] {
  return players.map((player) => {
    const choice = lobby.get(player.seat);
    const member = game.running ? game.squad.get(player.seat) : undefined;
    return {
      seat: player.seat,
      name: player.name,
      weapon: member?.gun.weapon ?? choice.weapon,
      ready: choice.ready,
      connected: player.connected,
      playing: Boolean(member),
      ammo: member?.gun.ammo ?? 0,
      magazine: member?.gun.spec.magazine ?? 0,
      reloading: member?.gun.reloading ?? false,
    };
  });
}

export function buildHud(players: readonly Player[], lobby: Lobby, game: SurvivalGame, healed: number): SurvivalHud {
  const spec = stageSpec(game.stage);
  const boss = game.encounter?.zombies.find((z) => isBoss(z.kind) && alive(z));
  return {
    phase: game.phase,
    cutscene: game.cutscene,
    stage: game.stage,
    stageTitle: spec.title,
    objective: objectiveFor(game.stage),
    health: Math.ceil(game.health),
    maxHealth: MAX_HEALTH,
    remaining: game.phase === "fight" ? (game.encounter?.remaining ?? null) : null,
    boss: boss ? { name: KINDS[boss.kind].name, left: weakLeft(boss), total: boss.weak.length } : null,
    seats: seatViews(players, lobby, game),
    lines: game.squad.lines(),
    healed,
  };
}

export function buildState(hud: SurvivalHud): StateMessage {
  const seats: SeatView[] = hud.seats.map((s) => ({ name: s.name, weapon: s.weapon, ready: s.ready, connected: s.connected, playing: s.playing }));
  return {
    kind: "state",
    phase: hud.phase,
    stage: hud.stage,
    stageTitle: hud.stageTitle,
    objective: hud.objective,
    health: hud.health,
    maxHealth: hud.maxHealth,
    seats,
  };
}

export function buildGun(game: SurvivalGame, seat: Seat): GunMessage | null {
  const gun = game.squad.get(seat)?.gun;
  if (!gun) return null;
  return { kind: "gun", weapon: gun.weapon, ammo: gun.ammo, magazine: gun.spec.magazine, reloading: gun.reloading, reloadSeconds: gun.reloading ? gun.reloadSeconds : 0 };
}

export function buildScore(game: SurvivalGame, seat: Seat): ScoreMessage | null {
  const stats = game.squad.get(seat)?.stats;
  if (!stats) return null;
  return { kind: "score", kills: stats.kills, accuracy: accuracy(stats), headshots: stats.headshots, weakHits: stats.weakHits };
}
