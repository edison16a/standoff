"use client";
import type { CSSProperties } from "react";
import { GUNS } from "../../engine/guns";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import type { PaneView } from "../host-store";

/**
 * One player's HUD in their own view: their name at the top, health at
 * the bottom left, the magazine and a reload bar at the bottom right. A
 * player who is down is told so, and a dropped phone is flagged.
 */
export function PaneCorner({ pane }: { pane: PaneView }) {
  const team = TEAMS[pane.team];
  const low = pane.health <= 30;
  const empty = pane.ammo === 0;
  const style = { "--player": pane.colour, "--team": team.color, "--hp": pane.health / 100 } as CSSProperties;
  return (
    <div className={`cb-corner ${pane.alive ? "" : "cb-corner--down"}`} style={style}>
      <span className="cb-corner__name">
        <i aria-hidden="true" />
        {pane.name}
        {pane.away && <em>Phone away</em>}
      </span>
      <div className={`cb-health ${low ? "cb-health--low" : ""}`} aria-label={`Health ${pane.health}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor" />
        </svg>
        <strong>{pane.health}</strong>
        <span className="cb-health__bar">
          <span className="cb-health__fill" />
        </span>
      </div>
      <div className={`cb-ammo ${empty ? "cb-ammo--empty" : ""}`} aria-label={`${pane.ammo} of ${pane.magazine} rounds`}>
        <GunIcon gun={pane.gun} size={64} className="cb-ammo__gun" />
        <span className="cb-ammo__count">
          <strong>{pane.ammo}</strong>/{pane.magazine}
        </span>
        <span className="cb-ammo__name">{pane.reloading ? "Reloading" : empty ? "Empty" : GUNS[pane.gun].name}</span>
        {pane.reloading && (
          <span className="cb-ammo__reload">
            <span style={{ width: `${Math.round(pane.reload * 100)}%` }} />
          </span>
        )}
      </div>
      {!pane.alive && (
        <div className="cb-corner__down">
          <strong>Down</strong>
          <span>Back next round</span>
        </div>
      )}
    </div>
  );
}
