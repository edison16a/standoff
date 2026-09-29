"use client";
import { playerColor } from "@/games/kit/players";
import { NAME_MAX } from "@/platform/profile";
import { BUILD_LIST, buildAt } from "../../engine/builds";
import { useBoxingStore } from "../host-store";
import { COMPUTER_NAME } from "../names";
import { BuildCard, StatBars } from "./BuildCard";
import { useSession } from "./session-context";

/**
 * Choosing builds. Each player leans left or right to browse and holds
 * their guard up to lock in; the mouse works too. Each player's name
 * heads their column and can be typed over. With one player the
 * computer takes a different build.
 */
export function PickScreen() {
  const session = useSession();
  const players = useBoxingStore((state) => state.players);
  const picks = useBoxingStore((state) => state.picks);
  const names = useBoxingStore((state) => state.names);
  const locked = useBoxingStore((state) => state.locked);
  const holding = useBoxingStore((state) => state.holding);
  const sides = players === 2 ? ([0, 1] as const) : ([0] as const);
  const cpu = buildAt(picks[1]);
  return (
    <section className="bx-pick">
      <header className="bx-pick__head">
        <h2>Choose your build</h2>
        <p>Lean left or right to browse. Hold your guard up to lock in.</p>
      </header>
      <div className={`bx-pick__sides bx-pick__sides--${players}`}>
        {sides.map((id) => (
          <div key={id} className="bx-pick__side" style={{ ["--who" as string]: playerColor(id + 1) }}>
            <div className="bx-pick__label">
              <input
                className="bx-pick__name"
                aria-label={`Player ${id + 1} name`}
                defaultValue={names[id]}
                maxLength={NAME_MAX}
                spellCheck={false}
                onBlur={(event) => session.rename(id, event.currentTarget.value)}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
              />
              <span className="bx-pick__state">{locked[id] ? "Ready" : holding[id] > 0 ? "Hold it" : "Choosing"}</span>
            </div>
            <div className="bx-pick__cards">
              {BUILD_LIST.map((build, index) => (
                <BuildCard key={build.id} build={build} on={picks[id] === index} locked={locked[id]} holding={picks[id] === index ? holding[id] : 0} onChoose={() => session.choose(id, index)} />
              ))}
            </div>
            <button type="button" className="bx-button" disabled={locked[id]} onClick={() => session.lock(id)}>
              {locked[id] ? "Locked in" : "Lock in"}
            </button>
          </div>
        ))}
        {players === 1 && (
          <div className="bx-pick__versus">
            <span className="bx-pick__vs">VS</span>
            <span className="bx-pick__cpu">{COMPUTER_NAME}</span>
            <span className="bx-pick__cpu-nick">{cpu.name}</span>
            <StatBars bars={cpu.bars} />
          </div>
        )}
      </div>
      <button type="button" className="bx-back" onClick={() => session.menu()}>
        Back
      </button>
    </section>
  );
}
