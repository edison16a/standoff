"use client";
import { playerColor } from "@/games/kit/players";
import { CHARACTER_IDS, CHARACTERS } from "../../roster";
import { FIGHTER_STATS, PICKER_COLOURS } from "../../ui/fighter-stats";
import { Portrait } from "../../ui/Portrait";
import { usePhoneStore } from "../phone-store";
import { useController } from "./session-context";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bb-stat">
      <span className="bb-stat__label">{label}</span>
      <span className="bb-stat__bar" aria-label={`${value} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`bb-stat__pip ${i <= value ? "bb-stat__pip--on" : ""}`} />
        ))}
      </span>
    </div>
  );
}

/**
 * Pick your fighter: four cards and the chosen one's style. Two players
 * may pick the same fighter; each wears their own colour.
 */
export function FighterStep({ seat }: { seat: number }) {
  const session = useController();
  const wanted = usePhoneStore((s) => s.wanted);
  const colour = playerColor(seat);
  const shown = wanted ?? "karate";
  const c = CHARACTERS[shown];
  const stats = FIGHTER_STATS[shown];

  return (
    <div className="bb-pick">
      <div className="bb-pick__list" role="group" aria-label="Fighters">
        {CHARACTER_IDS.map((id) => (
          <button key={id} type="button" className={`bb-pick__card ${wanted === id ? "bb-pick__card--on" : ""}`} aria-pressed={wanted === id} onClick={() => session.pick(id)}>
            <Portrait character={id} colour={wanted === id ? colour : PICKER_COLOURS[id]} className="bb-pick__face" />
            <span className="bb-pick__name">{CHARACTERS[id].name}</span>
          </button>
        ))}
      </div>
      <div className="bb-pick__info" style={{ "--fighter": colour } as React.CSSProperties}>
        <strong className="bb-pick__title">{wanted ? c.name : "Tap a fighter"}</strong>
        <p className="bb-pick__blurb">{wanted ? c.blurb : "Each has their own moves for every direction."}</p>
        {wanted && (
          <div className="bb-pick__stats">
            <Stat label="Speed" value={stats.speed} />
            <Stat label="Power" value={stats.power} />
            <Stat label="Reach" value={stats.reach} />
          </div>
        )}
      </div>
    </div>
  );
}
