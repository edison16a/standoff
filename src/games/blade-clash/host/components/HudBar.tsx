"use client";
import type { CSSProperties } from "react";
import { CHARACTERS } from "@/games/blade-clash/characters";
import { MAX_HEALTH } from "@/games/blade-clash/engine/rules";
import { SLOTS, type Slot } from "@/games/blade-clash/players";
import { VIEWS } from "@/games/blade-clash/render/split";
import { playerColor } from "@/games/kit/players";
import { SplitMap } from "@/games/kit/split/SplitMap";
import { useBladeStore } from "../host-store";
import type { SeatState } from "../lobby";

/** A player's status in as few words as possible, by the name they chose. */
function status(seat: SeatState): string {
  if (seat.computer) return "Computer ready";
  if (!seat.connected) return seat.pick ? "Reconnecting" : "Waiting for a player";
  if (seat.ready) return "Ready";
  return seat.pick ? "Picked" : "Setting up";
}

/**
 * Along the top of one player's half: their name, their fighter, and a
 * health bar of five segments that empties as they take hits. Before the
 * fight it says who is here and ready instead.
 */
function PlayerHud({ slot }: { slot: Slot }) {
  const seat = useBladeStore((state) => state.seats[slot]);
  const name = useBladeStore((state) => state.names[slot]);
  const hud = useBladeStore((state) => state.hud);
  const rect = VIEWS[slot];
  const style = { "--lamp": playerColor(slot), left: `${rect.x * 100}%`, width: `${rect.w * 100}%` } as CSSProperties;
  const health = hud?.health[slot] ?? MAX_HEALTH;
  return (
    <div className={`hud hud--p${slot}`} style={style}>
      <div className="hud__card">
        <strong className="hud__name">{name}</strong>
        <span className="hud__sub">{seat.pick ? CHARACTERS[seat.pick].name : ""}</span>
        {hud ? (
          <span className="hud__health" role="meter" aria-label={`${name} health`} aria-valuemin={0} aria-valuemax={MAX_HEALTH} aria-valuenow={health}>
            {Array.from({ length: MAX_HEALTH }, (_, i) => (
              <span key={i} className={`hud__cell ${i < health ? "hud__cell--full" : ""}`} />
            ))}
          </span>
        ) : (
          <span className={`hud__status ${seat.ready || seat.computer ? "hud__status--ready" : ""}`}>{status(seat)}</span>
        )}
      </div>
    </div>
  );
}

/** Both players' bars, and the little map of who plays in which half between them. */
export function HudBar() {
  const names = useBladeStore((state) => state.names);
  const panes = SLOTS.map((slot) => ({ name: names[slot], color: playerColor(slot), rect: VIEWS[slot] }));
  return (
    <>
      <PlayerHud slot={1} />
      <PlayerHud slot={2} />
      <div className="hud-map">
        <SplitMap panes={panes} />
      </div>
    </>
  );
}
