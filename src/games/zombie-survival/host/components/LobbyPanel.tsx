"use client";
import { playerColor } from "@/games/kit/players";
import { WEAPONS } from "../../engine/weapons";
import { useSurvivalStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * Before the run: who has joined, their guns, who is ready, and a Start
 * button for when not everyone wants to wait. The run also starts on its
 * own once everyone here is ready.
 */
export function LobbyPanel() {
  const session = useSession();
  const seats = useSurvivalStore((s) => s.hud.seats);
  const here = seats.filter((s) => s.connected);
  const ready = here.filter((s) => s.ready).length;
  if (here.length === 0) return null;
  return (
    <section className="zs-lobby" aria-label="Players">
      <h1 className="zs-lobby__title">Zombie Survival</h1>
      <p className="zs-lobby__lead">Reach the chopper. Then the ship. Aim true: every bullet counts.</p>
      <ul className="zs-lobby__list">
        {here.map((seat) => (
          <li key={seat.seat} className="zs-lobby__row" style={{ ["--seat" as string]: playerColor(seat.seat) }}>
            <span className="zs-dot" style={{ background: playerColor(seat.seat) }} />
            <span className="zs-lobby__name">{seat.name}</span>
            <span className="zs-lobby__gun">{seat.weapon ? WEAPONS[seat.weapon].name : "Choosing a gun"}</span>
            <span className={`zs-lobby__flag ${seat.ready ? "zs-lobby__flag--on" : ""}`}>{seat.ready ? "Ready" : "Setting up"}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--primary btn--lg zs-lobby__start" disabled={ready === 0} onClick={() => session.start()}>
        {ready === 0 ? "Waiting for someone to be ready" : ready === here.length ? "Start" : `Start with ${ready} ready`}
      </button>
      <p className="zs-lobby__hint">Players still setting up can join the run when they are ready.</p>
    </section>
  );
}
