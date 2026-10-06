"use client";
import { playerColor } from "@/games/kit/players";
import { BUILDS, buildFor } from "../../engine/builds";
import { useBoxingStore } from "../host-store";
import { BuildCard } from "./BuildCard";
import { useSession } from "./session-context";

/**
 * Choosing builds. Each player leans left or right to browse and holds
 * their guard up to lock in; the mouse works too. A build is how you
 * fight, with its stats on its card; your own name stays who you are.
 * With one player the computer takes a different build. The chosen
 * builds are already in the ring behind.
 */
export function PickScreen() {
  const session = useSession();
  const players = useBoxingStore((state) => state.players);
  const picks = useBoxingStore((state) => state.picks);
  const locked = useBoxingStore((state) => state.locked);
  const holding = useBoxingStore((state) => state.holding);
  const names = session.names();
  const sides = players === 2 ? ([0, 1] as const) : ([0] as const);
  return (
    <section className="bx-pick">
      <header className="bx-pick__head">
        <h2>Choose your build</h2>
        <p>{session.keys ? "A and D or the arrows to browse. Enter to lock in." : "Lean left or right to browse. Hold your guard up to lock in."}</p>
      </header>
      <div className={`bx-pick__sides bx-pick__sides--${players}`}>
        {sides.map((id) => (
          <div key={id} className="bx-pick__side" style={{ ["--who" as string]: playerColor(id + 1) }}>
            <div className="bx-pick__label">
              <span className="bx-pick__who">{names[id]}</span>
              <span className="bx-pick__state">{locked[id] ? "Ready" : holding[id] > 0 ? "Hold it" : "Choosing"}</span>
            </div>
            <div className="bx-pick__cards">
              {BUILDS.map((build, index) => (
                <BuildCard
                  key={build.id}
                  build={build}
                  mine={picks[id] === index}
                  locked={locked[id]}
                  holding={holding[id]}
                  taken={players === 2 && picks[id === 0 ? 1 : 0] === index}
                  onChoose={() => session.choose(id, index)}
                />
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
            <span className="bx-pick__cpu">{names[1]}</span>
            <span className="bx-pick__cpu-build">{buildFor(picks[1]).name}</span>
            <span className="bx-pick__cpu-nick">{buildFor(picks[1]).blurb}</span>
          </div>
        )}
      </div>
      <button type="button" className="bx-back" onClick={() => session.menu()}>
        Back
      </button>
    </section>
  );
}
