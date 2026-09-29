"use client";
import { lazy, Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { CHARACTERS } from "../../characters";
import { findTrack } from "../../tracks";
import { raceTime } from "../../ui/format";
import { useKartStore } from "../host-store";
import type { PodiumPlace } from "./results/podium-scene";
import { useSession } from "./session-context";

// The podium's 3D scene loads with the results, not with the race.
const PodiumCanvas = lazy(() => import("./results/PodiumCanvas"));

/**
 * The finish: the top three karts on a podium with their cups under
 * spotlights and confetti, the winner's name big across the top, every
 * place with its time along the bottom, and the two ways on: race the
 * same map again, or go back and pick another.
 */
export function Results() {
  const session = useSession();
  const standings = useKartStore((state) => state.standings);
  const mapId = useKartStore((state) => state.mapId);
  const winner = standings[0];
  // Race again needs someone ready: a phone still in the room with its driver picked.
  const ready = useKartStore((state) => state.seats.filter((s) => s.connected && s.ready).length);
  const places: PodiumPlace[] = standings
    .filter((row) => row.place >= 1 && row.place <= 3)
    .map((row) => ({ place: row.place as 1 | 2 | 3, character: row.character, colour: row.color }));
  const time = winner?.finished && winner.time !== null ? raceTime(winner.time) : null;

  return (
    <div className="mk-results">
      <Suspense fallback={null}>
        <PodiumCanvas places={places} />
      </Suspense>
      <VictoryOverlay
        eyebrow={`${findTrack(mapId).name} winner`}
        names={winner ? [{ name: winner.name, colour: winner.color }] : [{ name: "Race over" }]}
        subtitle={winner ? `${CHARACTERS[winner.character].kart}${time ? `, ${time}` : ""}` : undefined}
        placings={standings.map((row) => ({
          place: row.place,
          name: row.name,
          colour: row.color,
          detail: row.finished && row.time !== null ? raceTime(row.time) : "Did not finish",
        }))}
      >
        <button type="button" className="btn btn--lg" onClick={() => session.backToLobby()}>
          Change map
        </button>
        <button type="button" className="btn btn--primary btn--lg" disabled={ready === 0} onClick={() => session.startRace()}>
          <Icon name="refresh" />
          Race again
        </button>
      </VictoryOverlay>
    </div>
  );
}
