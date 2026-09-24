"use client";
import { raceTime } from "../../ui/format";
import { useKartStore } from "../host-store";

/**
 * Who is where: every kart in race order with its lap, or its time once
 * it has finished. Players' rows carry their seat colour.
 */
export function Standings() {
  const standings = useKartStore((state) => state.standings);
  const laps = useKartStore((state) => state.laps);
  return (
    <ol className="mk-standings" aria-label="Race standings">
      {standings.map((row) => (
        <li key={row.kartId} className={`mk-standings__row ${row.computer ? "mk-standings__row--cpu" : ""}`} style={{ "--player": row.color } as React.CSSProperties}>
          <span className="mk-standings__place">{row.place}</span>
          <span className="mk-standings__chip" />
          <span className="mk-standings__name">{row.name}</span>
          <span className="mk-standings__lap">{row.finished && row.time !== null ? raceTime(row.time) : `Lap ${row.lap}/${laps}`}</span>
        </li>
      ))}
    </ol>
  );
}
