import { CHARACTERS } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import { TOUCHES_TO_WIN } from "@/games/fencing/protocol";
import { useHostStore } from "../host-store";
import type { SeatState } from "../lobby";

/** A player's status in as few words as possible. */
function status(slot: Slot, seat: SeatState): string {
  if (seat.computer) return "Computer ready";
  if (!seat.connected) return seat.pick ? `Player ${slot} reconnecting` : `Waiting for player ${slot}`;
  return seat.ready ? `Player ${slot} ready` : `Player ${slot} connected`;
}

/**
 * One player's chip. Before the match it says who is here and ready.
 * During it, the fencer's name and a pip per touch.
 */
function PlayerChip({ slot }: { slot: Slot }) {
  const seat = useHostStore((state) => state.seats[slot]);
  const hud = useHostStore((state) => state.hud);
  const name = seat.pick ? CHARACTERS[seat.pick].name : null;

  if (!hud) {
    return (
      <div className={`chip chip--p${slot} ${seat.connected ? "chip--on" : ""}`}>
        <span className={`dot ${seat.connected ? "dot--on" : ""}`} />
        <span>{status(slot, seat)}</span>
      </div>
    );
  }
  const score = hud.scores[slot];
  return (
    <div className={`chip chip--p${slot} chip--on`}>
      <strong>{name}</strong>
      <span className="pips" aria-label={`${score} of ${TOUCHES_TO_WIN}`}>
        {Array.from({ length: TOUCHES_TO_WIN }, (_, i) => (
          <span key={i} className={`pip ${i < score ? "pip--on" : ""}`} />
        ))}
      </span>
      {!seat.connected && <span className="dot" title="Disconnected" />}
    </div>
  );
}

export function PlayerBar() {
  return (
    <div className="player-bar">
      <PlayerChip slot={1} />
      <PlayerChip slot={2} />
    </div>
  );
}
