"use client";
import { useBoxingStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * The first screen: one player against the computer, or two side by side
 * in front of the camera. Chosen with the mouse, since nobody is
 * calibrated yet.
 */
export function PlayersMenu() {
  const session = useSession();
  const records = useBoxingStore((state) => state.records);
  return (
    <section className="bx-menu">
      <header className="bx-menu__head">
        <p className="bx-eyebrow">Camera game</p>
        <h1 className="bx-logo">
          <span>BOXING</span>
        </h1>
        <p className="bx-menu__lead">Your body is the controller. Stand back from the camera, put your gloves up and fight.</p>
      </header>
      <div className="bx-menu__choices">
        <button type="button" className="bx-choice" onClick={() => session.choosePlayers(1)}>
          <span className="bx-choice__count">1</span>
          <span className="bx-choice__name">One player</span>
          <span className="bx-choice__text">Against the computer, three rounds</span>
        </button>
        <button type="button" className="bx-choice bx-choice--two" onClick={() => session.choosePlayers(2)}>
          <span className="bx-choice__count">2</span>
          <span className="bx-choice__name">Two players</span>
          <span className="bx-choice__text">Side by side in front of the camera</span>
        </button>
      </div>
      <ul className="bx-menu__how">
        <li>
          <strong>Punch</strong> at the screen with either hand
        </li>
        <li>
          <strong>Block</strong> with both gloves up by your face
        </li>
        <li>
          <strong>Duck</strong> or lean to make punches miss
        </li>
        <li>
          <strong>Counter</strong> with a left jab after a block or a dodge
        </li>
      </ul>
      {records.wins + records.losses > 0 && (
        <p className="bx-menu__records">
          Against the computer: {records.wins} won, {records.losses} lost
          {records.fastestKo !== null && `. Fastest knockout ${formatSeconds(records.fastestKo)}`}
        </p>
      )}
    </section>
  );
}

export function formatSeconds(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
