"use client";
import { playerColor } from "@/games/kit/players";
import { Logo } from "../../showcase/Logo";
import { setName, setPlayers, useSurfStore } from "../store";
import { BestTable } from "./BestTable";
import { useSession } from "./session-context";

/**
 * The first screen, over the demo run: one or two players, their names
 * for the best scores table, how to play, and Start.
 */
export function Lobby() {
  const session = useSession();
  const players = useSurfStore((s) => s.players);
  const names = useSurfStore((s) => s.names);
  const best = useSurfStore((s) => s.best);
  return (
    <div className="ss-lobby">
      <div className="ss-lobby__card">
        <Logo />
        <p className="ss-lobby__tagline">Run the rails from the waist up. No phones needed.</p>
        <div className="ss-lobby__count" role="radiogroup" aria-label="Players">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={players === n}
              className={`ss-chip${players === n ? " ss-chip--on" : ""}`}
              onClick={() => setPlayers(n)}
            >
              {n === 1 ? "1 player" : "2 players"}
            </button>
          ))}
        </div>
        <div className="ss-lobby__names">
          {Array.from({ length: players }, (_, i) => (
            <label key={i} className="ss-name" style={{ borderColor: playerColor(i + 1) }}>
              <span className="ss-name__tag" style={{ background: playerColor(i + 1) }}>
                {players === 2 ? (i === 0 ? "Left" : "Right") : "Runner"}
              </span>
              <input
                className="ss-name__input"
                value={names[i]}
                maxLength={20}
                placeholder={`Player ${i + 1}`}
                aria-label={`Player ${i + 1} name`}
                onChange={(e) => setName(i + 1, e.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="ss-lobby__note">Type a name to go on the best scores.</p>
        <button type="button" className="ss-button ss-button--go" onClick={() => session.start()}>
          Start
        </button>
        <ul className="ss-lobby__how">
          <li>
            <b>Move</b> or lean left and right to change track
          </li>
          <li>
            <b>Jump</b> over barriers
          </li>
          <li>
            <b>Duck</b> to roll under the high ones
          </li>
          <li>
            <b>Waist up</b> is all the camera needs to see
          </li>
        </ul>
      </div>
      {best.length > 0 && <BestTable entries={best} />}
    </div>
  );
}
