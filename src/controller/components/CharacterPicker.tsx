"use client";
import { FencerCanvas } from "@/components/game/FencerCanvas";
import { CHARACTER_IDS, CHARACTERS } from "@/shared/characters";
import type { Slot } from "@/shared/players";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";

/** Four cards, one per fencer. A fencer the other player has is shown as taken. */
export function CharacterPicker({ slot }: { slot: Slot }) {
  const session = useController();
  const pick = useControllerStore((state) => state.pick);
  const game = useControllerStore((state) => state.game);
  const theirs = game?.picks[slot === 1 ? 1 : 0] ?? null;

  return (
    <div className="picker">
      {CHARACTER_IDS.map((id) => {
        const taken = theirs === id;
        const chosen = pick === id;
        return (
          <button
            key={id}
            type="button"
            className={`picker__card ${chosen ? "picker__card--chosen" : ""}`}
            disabled={taken}
            aria-pressed={chosen}
            onClick={() => session.pick(id)}
          >
            <FencerCanvas characterId={id} slot={slot} className="picker__art" />
            <span className="picker__name">{CHARACTERS[id].name}</span>
            {taken && <span className="picker__tag muted">Taken</span>}
          </button>
        );
      })}
    </div>
  );
}
