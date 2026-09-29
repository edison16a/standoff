"use client";
import type { CSSProperties } from "react";
import { CHARACTERS } from "@/games/blade-clash/characters";
import { CharacterBadge } from "@/games/blade-clash/components/CharacterBadge";
import { POINTS_TO_WIN } from "@/games/blade-clash/engine/rules";
import { otherSlot, SLOTS, type Slot } from "@/games/blade-clash/players";
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
 * Along the top of one player's half: their fighter's emblem, their name
 * and their points: five slanted blades that light up one by one as
 * they land slashes. Taking a slash draws the card afresh, which plays its
 * shake once. Before the fight it says who is here and ready.
 */
function PlayerHud({ slot }: { slot: Slot }) {
  const seat = useBladeStore((state) => state.seats[slot]);
  const name = useBladeStore((state) => state.names[slot]);
  const hud = useBladeStore((state) => state.hud);
  const rect = VIEWS[slot];
  const colour = playerColor(slot);
  const style = { "--lamp": colour, left: `${rect.x * 100}%`, width: `${rect.w * 100}%` } as CSSProperties;
  const points = hud?.score[slot] ?? 0;
  const taken = hud?.score[otherSlot(slot)] ?? 0;
  return (
    <div className={`hud hud--p${slot}`} style={style}>
      <div key={taken} className={`hud__card ${hud && taken > 0 ? "hud__card--hurt" : ""}`}>
        {seat.pick ? <CharacterBadge characterId={seat.pick} trim={colour} className="hud__badge" /> : <span className="hud__badge hud__badge--empty" />}
        <span className="hud__who">
          <strong className="hud__name">{name}</strong>
          <span className="hud__sub">{seat.pick ? CHARACTERS[seat.pick].name : ""}</span>
        </span>
        {hud ? (
          <span className="hud__points" role="meter" aria-label={`${name} points`} aria-valuemin={0} aria-valuemax={POINTS_TO_WIN} aria-valuenow={points}>
            {Array.from({ length: POINTS_TO_WIN }, (_, i) => (
              <span key={i} className={`hud__cell ${i < points ? "hud__cell--full" : ""} ${i === points - 1 ? "hud__cell--new" : ""}`} />
            ))}
          </span>
        ) : (
          <span className={`hud__status ${seat.ready || seat.computer ? "hud__status--ready" : ""}`}>{status(seat)}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Both players' bars, and the little map of who plays in which half
 * between them. The map steps aside for the hit moment, whose letterbox
 * bar would otherwise cut it in half.
 */
export function HudBar() {
  const names = useBladeStore((state) => state.names);
  const moment = useBladeStore((state) => state.hud?.phase === "point" || state.hud?.phase === "finish");
  const panes = SLOTS.map((slot) => ({ name: names[slot], color: playerColor(slot), rect: VIEWS[slot] }));
  return (
    <>
      <PlayerHud slot={1} />
      <PlayerHud slot={2} />
      <div className={`hud-map ${moment ? "hud-map--away" : ""}`}>
        <SplitMap panes={panes} />
      </div>
    </>
  );
}
