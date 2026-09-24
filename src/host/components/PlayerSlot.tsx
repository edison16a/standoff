import { FencerCanvas } from "@/components/game/FencerCanvas";
import { Icon } from "@/components/ui/Icon";
import { CHARACTERS } from "@/shared/characters";
import type { Slot } from "@/shared/players";
import type { SeatState } from "../lobby";

/** Where a player stands in the join flow, in plain words. */
function describe(seat: SeatState): string {
  if (!seat.connected) return seat.pick ? "Reconnecting" : "Waiting to join";
  if (!seat.pick) return "Choosing a fencer";
  return seat.ready ? "Ready" : "Getting ready";
}

/** One player's card in the lobby: status, and their fencer once picked. */
export function PlayerSlot({ slot, seat }: { slot: Slot; seat: SeatState }) {
  const character = seat.pick ? CHARACTERS[seat.pick] : null;
  return (
    <article className={`slot card ${seat.ready ? "slot--ready" : ""}`}>
      <header className="slot__head">
        <span className="label">Player {slot}</span>
        <span className={`pill ${seat.ready ? "pill--accent" : ""}`}>
          <span className={`dot ${seat.connected ? "dot--on" : ""}`} />
          {describe(seat)}
        </span>
      </header>
      <div className="slot__art">
        {character ? (
          <FencerCanvas characterId={character.id} slot={slot} />
        ) : (
          <span className="slot__empty muted">
            <Icon name="phone" size={28} />
          </span>
        )}
      </div>
      <footer className="slot__foot">
        <strong>{character?.name ?? "No fencer yet"}</strong>
        <span className="muted">{character?.tagline ?? (slot === 1 ? "Fences from the left." : "Fences from the right.")}</span>
      </footer>
    </article>
  );
}
