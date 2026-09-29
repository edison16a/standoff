"use client";
import { Logo } from "../../showcase/Logo";
import { setName, useSurfStore } from "../store";
import { BestTable } from "./BestTable";
import { DifficultyChips } from "./DifficultyChips";
import { useSession } from "./session-context";

/**
 * The first screen, over the demo run: how hard to start, a name for
 * the best scores table, how to play, and Start.
 */
export function Lobby() {
  const session = useSession();
  const name = useSurfStore((s) => s.name);
  const best = useSurfStore((s) => s.best);
  return (
    <div className="ss-lobby">
      <div className="ss-lobby__card">
        <Logo />
        <p className="ss-lobby__tagline">Run the rails from the waist up. No phones needed.</p>
        <DifficultyChips />
        <label className="ss-name">
          <span className="ss-name__tag">Runner</span>
          <input
            className="ss-name__input"
            value={name}
            maxLength={20}
            placeholder="Player 1"
            aria-label="Your name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
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
