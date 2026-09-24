"use client";
import { Icon } from "@/components/ui/Icon";
import { CHARACTERS } from "../../characters";
import { findTrack } from "../../tracks";
import { ordinal, raceTime } from "../../ui/format";
import { useKartStore } from "../host-store";
import { Confetti } from "./Confetti";
import { useSession } from "./session-context";

/**
 * The finish screen: the podium order with times, confetti, and the two
 * ways on: race the same map again, or go back and pick another.
 */
export function Results() {
  const session = useSession();
  const standings = useKartStore((state) => state.standings);
  const mapId = useKartStore((state) => state.mapId);
  const winner = standings[0];

  return (
    <div className="mk-results">
      <Confetti />
      <div className="mk-results__card">
        <span className="mk-results__eyebrow">{findTrack(mapId).name}</span>
        <h2>{winner ? `${winner.name} wins` : "Race over"}</h2>
        <ol className="mk-results__list">
          {standings.map((row) => (
            <li key={row.kartId} className={`mk-results__row mk-results__row--${row.place}`} style={{ "--player": row.color } as React.CSSProperties}>
              <span className="mk-results__place">{ordinal(row.place)}</span>
              <span className="mk-results__chip" />
              <span className="mk-results__name">
                {row.name}
                <small>{CHARACTERS[row.character].kart}</small>
              </span>
              <span className="mk-results__time">{row.finished && row.time !== null ? raceTime(row.time) : "Did not finish"}</span>
            </li>
          ))}
        </ol>
        <div className="mk-results__actions">
          <button type="button" className="btn btn--lg" onClick={() => session.backToLobby()}>
            Change map
          </button>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => session.startRace()}>
            <Icon name="refresh" />
            Race again
          </button>
        </div>
      </div>
    </div>
  );
}
