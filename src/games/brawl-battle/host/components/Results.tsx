"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CHARACTERS } from "../../roster";
import { Portrait } from "../../ui/Portrait";
import { useBrawlStore, type FighterCard } from "../host-store";
import { useSession } from "./session-context";

const PLACES = ["1st", "2nd", "3rd", "4th"];

/** Paper confetti falling over the card, in every fighter's colour. Fixed positions, so it never jumps between renders. */
function Confetti({ colours }: { colours: string[] }) {
  return (
    <div className="bb-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colours[i % colours.length],
            animationDelay: `${(i % 9) * 0.22}s`,
            animationDuration: `${2.6 + (i % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

function Row({ f }: { f: FighterCard }) {
  return (
    <tr style={{ "--fighter": f.colour } as React.CSSProperties}>
      <td className="bb-rank__place">{f.place ? PLACES[f.place - 1] : ""}</td>
      <th scope="row">
        <Portrait character={f.character} colour={f.colour} size={40} />
        <span>
          {f.name}
          <small>{f.bot ? "Computer" : CHARACTERS[f.character].name}</small>
        </span>
      </th>
      <td>{f.kos}</td>
      <td>{f.falls}</td>
      <td>{f.damage}</td>
    </tr>
  );
}

/**
 * The winner screen: the champion's portrait and name, then every
 * fighter by place with their KOs, falls and damage dealt. Play again
 * keeps the lineup on a new random stage; Change fighters goes back to
 * the lobby.
 */
export function Results() {
  const session = useSession();
  const fighters = useBrawlStore((s) => s.fighters);
  const winner = useBrawlStore((s) => s.winner);
  const canStart = useBrawlStore((s) => s.canStart);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 900);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  const champ = winner !== null ? fighters[winner] : undefined;
  const ranked = [...fighters].sort((a, b) => (a.place ?? 9) - (b.place ?? 9) || b.kos - a.kos);
  return (
    <div className="bb-results" style={{ "--fighter": champ?.colour ?? "#a855f7" } as React.CSSProperties}>
      <Confetti colours={fighters.map((f) => f.colour)} />
      <div className="bb-results__card">
        <header className="bb-results__head">
          {champ && <Portrait character={champ.character} colour={champ.colour} size={128} className="bb-results__face" />}
          <div>
            <span className="bb-results__eyebrow">{champ ? "Winner" : "Game"}</span>
            <h2>{champ ? `${champ.name} wins` : "A draw"}</h2>
          </div>
        </header>
        <table className="bb-rank">
          <thead>
            <tr>
              <th scope="col">Place</th>
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
