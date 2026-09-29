"use client";
import type { CSSProperties } from "react";
import { CharacterBadge } from "@/games/blade-clash/components/CharacterBadge";
import { otherSlot, type Slot } from "@/games/blade-clash/players";
import { playerColor } from "@/games/kit/players";
import { useBladeStore } from "../host-store";

/** One side of the moment: a fighter's emblem and name. */
function Fighter({ slot, role }: { slot: Slot; role: "from" | "to" }) {
  const name = useBladeStore((state) => state.names[slot]);
  const pick = useBladeStore((state) => state.seats[slot].pick);
  return (
    <span className={`moment__who moment__who--${role}`} style={{ "--lamp": playerColor(slot) } as CSSProperties}>
      {pick && <CharacterBadge characterId={pick} trim={playerColor(slot)} className="moment__badge" />}
      <strong className="moment__name">{name}</strong>
    </span>
  );
}

/**
 * The hit moment across the whole screen while play stops for a point:
 * letterbox bars close in, and the scorer's name slashes across to the
 * name of the one they hit, in slow motion with the game underneath. The
 * winning slash gets the same moment, gold. Timing lives in the CSS, keyed
 * to the point so every slash plays it from the start.
 */
export function PointMoment() {
  const hud = useBladeStore((state) => state.hud);
  const names = useBladeStore((state) => state.names);
  if (!hud || (hud.phase !== "point" && hud.phase !== "finish") || !hud.scorer) return null;
  const from = hud.scorer;
  const to = otherSlot(from);
  const final = hud.phase === "finish";
  const style = { "--from": playerColor(from), "--to": playerColor(to) } as CSSProperties;
  return (
    <div
      key={`${hud.score[1]}:${hud.score[2]}`}
      className={`moment ${final ? "moment--final" : ""}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={`${names[from]} slashes ${names[to]}`}
    >
      <div className="moment__strip" aria-hidden="true">
        <span className="moment__kicker">{final ? "Winning slash" : "Point"}</span>
        <div className="moment__row">
          <Fighter slot={from} role="from" />
          <span className="moment__cut">
            <span className="moment__streak" />
            <span className="moment__verb">slashes</span>
          </span>
          <Fighter slot={to} role="to" />
        </div>
        <span className="moment__score">
          <b style={{ color: "var(--from)" }}>{hud.score[from]}</b>
          <span>to</span>
          <b style={{ color: "var(--to)" }}>{hud.score[to]}</b>
        </span>
      </div>
    </div>
  );
}
