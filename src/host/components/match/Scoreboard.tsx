import { CHARACTERS } from "@/shared/characters";
import type { Slot } from "@/shared/players";
import { TOUCHES_TO_WIN } from "@/shared/protocol";
import { useHostStore } from "../../host-store";

/** One side of the scoreboard: name, fencer, and a pip per touch needed. */
function Side({ slot }: { slot: Slot }) {
  const seat = useHostStore((state) => state.seats[slot]);
  const score = useHostStore((state) => state.hud?.scores[slot] ?? 0);
  const name = seat.pick ? CHARACTERS[seat.pick].name : "Fencer";
  return (
    <div className={`score score--p${slot}`}>
      <div className="score__who">
        <span className="label">Player {slot}</span>
        <strong>{name}</strong>
      </div>
      <div className="score__pips" aria-label={`${score} of ${TOUCHES_TO_WIN} touches`}>
        {Array.from({ length: TOUCHES_TO_WIN }, (_, i) => (
          <span key={i} className={`score__pip ${i < score ? "score__pip--on" : ""}`} />
        ))}
      </div>
      {!seat.connected && <span className="pill">Disconnected</span>}
    </div>
  );
}

export function Scoreboard() {
  return (
    <div className="scoreboard card">
      <Side slot={1} />
      <span className="scoreboard__vs label">Best of 3</span>
      <Side slot={2} />
    </div>
  );
}
