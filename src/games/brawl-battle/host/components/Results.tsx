"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { VictoryOverlay } from "@/games/kit/victory/ui/VictoryOverlay";
import { CHARACTERS } from "../../roster";
import { useBrawlStore, type FighterCard } from "../host-store";
import { useSession } from "./session-context";

// The pedestal's 3D scene loads with the results, not with the match.
const PedestalCanvas = lazy(() => import("./results/PedestalCanvas"));

function Row({ f }: { f: FighterCard }) {
  return (
    <tr style={{ "--fighter": f.colour } as React.CSSProperties}>
      <th scope="row">
        {f.name}
        <small>{f.bot ? "Computer" : CHARACTERS[f.character].name}</small>
      </th>
      <td>{f.kos}</td>
      <td>{f.falls}</td>
      <td>{f.damage}</td>
    </tr>
  );
}

/**
 * The winner's scene: the champion on a pedestal lifting a gold cup,
 * their name big across the top, and in the corner every fighter by
 * place with their KOs, falls and damage dealt. Play again keeps the
 * lineup on a new random stage; Change fighters goes back to the lobby.
 */
export function Results() {
  const session = useSession();
  const fighters = useBrawlStore((s) => s.fighters);
  const winner = useBrawlStore((s) => s.winner);
  const canStart = useBrawlStore((s) => s.canStart);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // The last KO plays out in the arena first.
    const timer = setTimeout(() => setShown(true), 900);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  const champ = winner !== null ? fighters[winner] : undefined;
  const ranked = [...fighters].sort((a, b) => (a.place ?? 9) - (b.place ?? 9) || b.kos - a.kos);
  return (
    <div className="bb-results">
      {champ && (
        <Suspense fallback={null}>
          <PedestalCanvas character={champ.character} colours={fighters.map((f) => f.colour)} />
        </Suspense>
      )}
      <VictoryOverlay
        eyebrow={champ ? "Winner" : "Game over"}
        names={[{ name: champ ? champ.name : "A draw", colour: champ?.colour }]}
        subtitle={champ ? `${CHARACTERS[champ.character].name}, last one standing` : undefined}
      />
      {/* In the bottom left corner, so the champion on the pedestal has the middle to themselves. */}
      <div className="bb-results__panel">
        <table className="bb-rank">
          <thead>
            <tr>
              <th scope="col">Fighter</th>
              <th scope="col">KOs</th>
              <th scope="col">Falls</th>
              <th scope="col">Damage</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((f) => (
              <Row key={f.id} f={f} />
            ))}
          </tbody>
        </table>
        <div className="bb-results__actions">
          <button type="button" className="btn btn--lg" onClick={() => session.backToLobby()}>
            <Icon name="users" />
            Change fighters
          </button>
          <button type="button" className="btn btn--primary btn--lg" disabled={!canStart} onClick={() => session.start()}>
            <Icon name="refresh" />
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
