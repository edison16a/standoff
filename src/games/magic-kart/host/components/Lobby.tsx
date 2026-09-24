"use client";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { playerColor } from "@/games/kit/players";
import { CHARACTERS } from "../../characters";
import { drawThumbnail } from "../../render/thumbnail";
import { findTrack, TRACKS } from "../../tracks";
import type { TrackDef } from "../../tracks/types";
import { useKartStore } from "../host-store";
import { useSession } from "./session-context";

function MapCard({ def, chosen, onPick }: { def: TrackDef; chosen: boolean; onPick(): void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) drawThumbnail(canvasRef.current, def);
  }, [def]);
  return (
    <button type="button" className={`mk-map ${chosen ? "mk-map--on" : ""}`} aria-pressed={chosen} aria-label={`Race on ${def.name}`} onClick={onPick}>
      <canvas ref={canvasRef} className="mk-map__art" />
      <span className="mk-map__name">{def.name}</span>
    </button>
  );
}

function Players() {
  const seats = useKartStore((state) => state.seats);
  const joined = seats.filter((s) => s.connected);
  if (joined.length === 0) return <p className="mk-lobby__empty">Scan the code with your phone to join.</p>;
  return (
    <ul className="mk-roster">
      {joined.map((seat) => (
        <li key={seat.seat} className="mk-roster__row" style={{ "--player": playerColor(seat.seat) } as React.CSSProperties}>
          <span className="mk-roster__dot" />
          <span className="mk-roster__name">{seat.name}</span>
          <span className="mk-roster__kart">{seat.pick ? CHARACTERS[seat.pick].name : "Choosing"}</span>
          <span className={`mk-roster__state ${seat.ready ? "mk-roster__state--on" : ""}`}>{seat.ready ? "Ready" : "Setting up"}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The lobby on the big screen: pick the map with the mouse while the
 * chosen map's demo race runs behind, see who has joined and who is
 * ready, choose whether computer karts fill the grid, and start.
 */
export function Lobby() {
  const session = useSession();
  const mapId = useKartStore((state) => state.mapId);
  const computers = useKartStore((state) => state.computers);
  const seats = useKartStore((state) => state.seats);
  const ready = seats.filter((s) => s.connected && s.ready).length;
  const waiting = seats.filter((s) => s.connected && !s.ready).length;
  const map = findTrack(mapId);

  return (
    <div className="mk-lobby">
      <header className="mk-lobby__title">
        <span className="mk-lobby__eyebrow">Magic Kart</span>
        <h1>{map.name}</h1>
        <p>{map.blurb}</p>
      </header>
      <section className="mk-lobby__maps" aria-label="Maps">
        {TRACKS.map((def) => (
          <MapCard key={def.id} def={def} chosen={def.id === mapId} onPick={() => session.setMap(def.id as typeof mapId)} />
        ))}
      </section>
      <aside className="mk-lobby__side">
        <h2>Racers</h2>
        <Players />
        <label className="mk-switch">
          <input type="checkbox" checked={computers} onChange={(event) => session.setComputers(event.target.checked)} />
          <span className="mk-switch__track" />
          <span>Fill the grid with computer karts</span>
        </label>
        <p className="mk-lobby__note">
          {ready === 0 ? "Players tap Ready on their phones." : waiting > 0 ? `${ready} ready. ${waiting} still setting up and will join the next race.` : `${ready} ready. Two laps.`}
        </p>
        <button type="button" className="btn btn--primary btn--lg btn--block mk-lobby__start" disabled={ready === 0} onClick={() => session.startRace()}>
          <Icon name="play" />
          Start race
        </button>
      </aside>
    </div>
  );
}
