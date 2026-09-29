"use client";
import { Logo } from "../../showcase/Logo";
import { setName, useSurfStore, type InputMode } from "../store";
import { Board } from "./Board";
import { DifficultyChips } from "./DifficultyChips";
import { InputPicker } from "./InputPicker";
import { useSession } from "./session-context";

/**
 * The first screen, over the demo run: camera or keyboard, how hard to
 * start, a name for the leaderboard, how to play, and Start. The
 * leaderboard sits beside it.
 */
export function Lobby() {
  const session = useSession();
  const name = useSurfStore((s) => s.name);
  const input = useSurfStore((s) => s.input);
  return (
    <div className="ss-lobby">
      <div className="ss-lobby__card">
        <Logo />
        <p className="ss-lobby__tagline">{input === "camera" ? "Run the rails from the waist up. No phones needed." : "Run the rails with the arrow keys or WASD."}</p>
        <InputPicker />
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
        <p className="ss-lobby__note">Every run goes on this computer&apos;s leaderboard.</p>
        <button type="button" className="ss-button ss-button--go" onClick={() => session.start()}>
          Start
        </button>
        <HowTo input={input} />
      </div>
      <Board />
    </div>
  );
}

function HowTo({ input }: { input: InputMode }) {
  if (input === "keyboard") {
    return (
      <ul className="ss-lobby__how">
        <li>
          <b>Left and right</b> or A and D to change track
        </li>
        <li>
          <b>Up</b> or W to jump
        </li>
        <li>
          <b>Down</b> or S to roll, hold to keep rolling
        </li>
      </ul>
    );
  }
  return (
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
  );
}
