"use client";
import { playerColor } from "@/games/kit/players";
import { LOOKS } from "../../render/models/looks";
import { useBoxingStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * Choosing boxers. Each player leans left or right to browse and holds
 * their guard up to lock in; the mouse works too. With one player the
 * computer takes a different boxer. The chosen boxers are already in
 * the ring behind.
 */
export function PickScreen() {
  const session = useSession();
  const players = useBoxingStore((state) => state.players);
  const picks = useBoxingStore((state) => state.picks);
  const locked = useBoxingStore((state) => state.locked);
  const holding = useBoxingStore((state) => state.holding);
  const sides = players === 2 ? ([0, 1] as const) : ([0] as const);
  return (
    <section className="bx-pick">
      <header className="bx-pick__head">
        <h2>Choose your boxer</h2>
        <p>Lean left or right to browse. Hold your guard up to lock in.</p>
      </header>
      <div className={`bx-pick__sides bx-pick__sides--${players}`}>
        {sides.map((id) => (
          <div key={id} className="bx-pick__side" style={{ ["--who" as string]: playerColor(id + 1) }}>
            <div className="bx-pick__label">
              <span className="bx-pick__who">Player {id + 1}</span>
              <span className="bx-pick__state">{locked[id] ? "Ready" : holding[id] > 0 ? "Hold it" : "Choosing"}</span>
            </div>
            <div className="bx-pick__cards">
              {LOOKS.map((look, index) => {
                const mine = picks[id] === index;
                const theirs = players === 2 && picks[id === 0 ? 1 : 0] === index;
                return (
                  <button
                    type="button"
                    key={look.id}
                    className={`bx-card${mine ? " bx-card--on" : ""}${mine && locked[id] ? " bx-card--locked" : ""}`}
                    disabled={locked[id] || theirs}
                    onClick={() => session.choose(id, index)}
                    style={{ ["--trunks" as string]: look.trunks, ["--gloves" as string]: look.gloves, ["--trim" as string]: look.trim }}
                  >
                    <span className="bx-card__stripe" aria-hidden="true" />
                    <span className="bx-card__nick">{look.nickname}</span>
                    <span className="bx-card__name">{look.name}</span>
                    <span className="bx-card__from">{look.from}</span>
                    {mine && !locked[id] && holding[id] > 0 && <span className="bx-card__hold" style={{ width: `${Math.round(holding[id] * 100)}%` }} />}
                  </button>
                );
              })}
            </div>
            <button type="button" className="bx-button" disabled={locked[id]} onClick={() => session.lock(id)}>
              {locked[id] ? "Locked in" : "Lock in"}
            </button>
          </div>
        ))}
        {players === 1 && (
          <div className="bx-pick__versus">
            <span className="bx-pick__vs">VS</span>
            <span className="bx-pick__cpu">{LOOKS[picks[1]]!.name}</span>
            <span className="bx-pick__cpu-nick">{LOOKS[picks[1]]!.nickname}, the computer</span>
          </div>
        )}
      </div>
      <button type="button" className="bx-back" onClick={() => session.menu()}>
        Back
      </button>
    </section>
  );
}
