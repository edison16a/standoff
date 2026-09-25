import { CHARACTERS } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import { TOUCHES_TO_WIN } from "@/games/blade-clash/protocol";
import { useFencingStore } from "../host-store";
import type { SeatState } from "../lobby";

/** A player's status in as few words as possible, by the name they chose. */
function status(name: string, seat: SeatState): string {
  if (seat.computer) return "Computer ready";
  if (!seat.connected) return seat.pick ? `${name} reconnecting` : "Waiting for a player";
  return seat.ready ? `${name} ready` : `${name} connected`;
}

/**
 * One player's chip. Before the match it says who is here and ready.
 * During it, the player's name, their fencer and a pip per touch.
 */
function PlayerChip({ slot }: { slot: Slot }) {
  const seat = useFencingStore((state) => state.seats[slot]);
  const hud = useFencingStore((state) => state.hud);
  const name = useFencingStore((state) => state.names[slot]);
  const fencer = seat.pick ? CHARACTERS[seat.pick].name : null;

  if (!hud) {
    return (
      <div className={`chip chip--p${slot} ${seat.connected ? "chip--on" : ""}`}>
        <span className={`dot ${seat.connected ? "dot--on" : ""}`} />
        <span>{status(name, seat)}</span>
      </div>
    );
  }
  const score = hud.scores[slot];
  return (
    <div className={`chip chip--p${slot} chip--on`}>
      <strong>{name}</strong>
      {fencer && <span className="chip__sub">{fencer}</span>}
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
