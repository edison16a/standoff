"use client";
import { playerColor } from "@/games/kit/players";
import { BLADES } from "../../blades";
import { BOMB_LABEL, BOMB_LEVELS, FRUIT_LABEL, FRUIT_RATES, ROUND_LENGTHS } from "../../engine/settings";
import { useFruitStore, type LobbySeat } from "../host-store";
import { useSession } from "./session-context";

/** Where a player is in their phone's setup, in a few words. */
function status(seat: LobbySeat): string {
  if (!seat.connected) return "Scan the code to join";
  if (seat.ready) return `Ready with ${BLADES[seat.blade].name}`;
  if (seat.step === "blade") return "Choosing a blade";
  if (seat.step === "ready") return "Almost ready";
  return "Calibrating";
}

function Choice<T extends string | number>({ label, options, value, name, onPick }: { label: string; options: readonly T[]; value: T; name: (option: T) => string; onPick(option: T): void }) {
  return (
    <div className="fn-choice">
      <span className="fn-choice__label">{label}</span>
      <div className="fn-choice__options" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={option === value} className="fn-choice__option" onClick={() => onPick(option)}>
            {name(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Before a round: who is here and how far through setup they are, the
 * round settings, and Start. Ready players can already slice the
 * practice fruit drifting behind it.
 */
export function Lobby() {
  const session = useSession();
  const settings = useFruitStore((state) => state.settings);
  const seats = useFruitStore((state) => state.seats);
  const ready = seats.filter((seat) => seat.connected && seat.ready).length;
  const joined = seats.filter((seat) => seat.connected).length;

  return (
    <>
      <header className="fn-title">
        <h1 className="fn-title__name">Fruit Slicer</h1>
        <p className="fn-title__tag">Point your phone at the screen. Swing to slice. Dodge the bombs.</p>
      </header>
      <aside className="fn-panel fn-lobby" aria-label="Round setup">
        <h2 className="fn-panel__head">Players</h2>
        <ul className="fn-players">
          {seats.map((seat) => (
            <li key={seat.seat} className={`fn-player ${seat.connected ? "" : "fn-player--empty"}`} style={{ ["--pop" as string]: playerColor(seat.seat) }}>
              <span className="fn-player__dot" />
              <span className="fn-player__name">{seat.connected ? seat.name : `Seat ${seat.seat}`}</span>
              <span className={`fn-player__status ${seat.ready ? "fn-player__status--ready" : ""}`}>{status(seat)}</span>
            </li>
          ))}
        </ul>
        <h2 className="fn-panel__head">Round</h2>
        <Choice label="Length" options={ROUND_LENGTHS} value={settings.seconds} name={(s) => `${s} s`} onPick={(seconds) => session.setSettings({ seconds })} />
        <Choice label="Bombs" options={BOMB_LEVELS} value={settings.bombs} name={(b) => BOMB_LABEL[b]} onPick={(bombs) => session.setSettings({ bombs })} />
        <Choice label="Fruit" options={FRUIT_RATES} value={settings.fruit} name={(f) => FRUIT_LABEL[f]} onPick={(fruit) => session.setSettings({ fruit })} />
        <button type="button" className="fn-start" disabled={ready === 0} onClick={() => session.start()}>
          {ready === 0 ? "Start" : `Start with ${ready} ${ready === 1 ? "player" : "players"}`}
        </button>
        <p className="fn-panel__hint">
          {joined === 0
            ? "Scan the code with a phone to join."
            : ready === 0
              ? "Waiting for a phone to finish setup."
              : ready < joined
                ? "Players still setting up join the next round."
                : "Ready players can practise on the fruit."}
        </p>
      </aside>
    </>
  );
}
