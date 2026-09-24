"use client";
import { useSyncExternalStore } from "react";
import { playerColor } from "@/games/kit/players";
import { WEAPONS } from "../../engine/weapons";
import { gunSlotX } from "../../render/gun-layout";
import { useSurvivalStore } from "../host-store";

const subscribeResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const aspect = () => window.innerWidth / Math.max(1, window.innerHeight);

/**
 * A tag under each player's gun: name, weapon, rounds left and kills.
 * It sits where the gun sits, so everyone finds their own at a glance.
 */
export function PlayerChips() {
  const seats = useSurvivalStore((s) => s.hud.seats);
  const lines = useSurvivalStore((s) => s.hud.lines);
  const ratio = useSyncExternalStore(subscribeResize, aspect, () => 16 / 9);
  const playing = seats.filter((s) => s.playing && s.connected);
  // Matches the first person layout: guns spread across at most 1.9 screen heights.
  const reach = 0.82 * Math.min(1, 1.9 / ratio);
  return (
    <div className="zs-chips">
      {playing.map((seat, index) => {
        const kills = lines.find((l) => l.seat === seat.seat)?.kills ?? 0;
        const left = 50 + 50 * reach * gunSlotX(index, playing.length);
        return (
          <div key={seat.seat} className="zs-chip" style={{ left: `${left}%`, ["--seat" as string]: playerColor(seat.seat) }}>
            <span className="zs-chip__name">{seat.name}</span>
            <span className="zs-chip__gun">{seat.weapon ? WEAPONS[seat.weapon].name : ""}</span>
            <span className={`zs-chip__ammo ${seat.ammo === 0 ? "zs-chip__ammo--empty" : ""}`}>
              {seat.reloading ? "Reloading" : `${seat.ammo} / ${seat.magazine}`}
            </span>
            <span className="zs-chip__kills">{kills} kills</span>
          </div>
        );
      })}
    </div>
  );
}
